import { sanitizeSave } from '../save';
import { services } from '../services';
import { WorldView } from '../view/world-view';
import type { App } from './app';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function boot(app: App): Promise<void> {
  const { platform, save, i18n, mute } = services();
  try {
    await platform.init();
  } catch (error) {
    console.error('[boot] platform.init failed', error);
  }
  const loaded = await save.load();
  const clean = sanitizeSave(loaded);
  if (JSON.stringify(clean) !== JSON.stringify(loaded)) {
    save.update((draft) => Object.assign(draft, clean));
  }
  const data = save.data;
  i18n.setLanguage(data.language ?? platform.getLanguage());
  mute.set('settings', !data.soundEnabled);
  mute.set('platform', !platform.isAudioEnabled());
  app.machine.go('preload');
}

async function preload(app: App): Promise<void> {
  app.loading.show();
  app.loading.setProgress(0.1);
  await nextFrame();
  const view = new WorldView();
  app.loading.setProgress(0.55);
  await nextFrame();
  app.attachView(view);
  view.compile(app.stage.renderer);
  app.stage.renderer.render(view.scene, view.rig.camera);
  app.loading.setProgress(1);
  await nextFrame();
  app.loading.hide();
  services().platform.gameReady();
  app.machine.go('menu');
}

export function registerStates(app: App): void {
  app.machine
    .register('boot', {
      enter: () => {
        boot(app).catch((error: unknown) => console.error('[boot] failed', error));
      },
    })
    .register('preload', {
      enter: () => {
        preload(app).catch((error: unknown) => console.error('[preload] failed', error));
      },
    })
    .register('menu', {
      enter: (from) => {
        if (from === 'pause' || from === 'game-over') app.finalizeRun();
        app.view?.reset();
        app.view?.setMode('menu', null);
        app.renderMenu();
        app.music.play('menu');
        app.menu.show();
        app.loop.start();
      },
      exit: () => app.menu.hide(),
    })
    .register('run', {
      enter: (from) => {
        const { gameplay, platform } = services();
        const resume = from === 'pause' || app.resumeRun;
        app.resumeRun = false;
        if (!resume) {
          app.beginRun();
          platform.levelStart({ level: 'run' });
        }
        app.hud.refreshTexts();
        app.hud.show();
        app.music.play('run');
        gameplay.start();
        app.loop.start();
      },
      exit: (to) => {
        if (to !== 'pause') app.hud.hide();
      },
    })
    .register('pause', {
      enter: () => {
        const { gameplay, mute } = services();
        app.loop.stop();
        gameplay.stop();
        mute.set('pause', true);
        app.pauseScreen.render();
        app.pauseScreen.show();
      },
      exit: (to) => {
        services().mute.set('pause', false);
        app.pauseScreen.hide();
        if (to !== 'run') app.hud.hide();
      },
    })
    .register('game-over', {
      enter: () => {
        app.music.play('menu');
        if (app.canOfferContinue) app.offerContinue();
        else app.showResults();
      },
      exit: () => {
        app.continueScreen.hide();
        app.gameOver.hide();
      },
    })
    .register('garage', {
      enter: () => {
        app.view?.setMode('garage', null);
        app.renderGarage();
        app.music.play('menu');
        app.garage.show();
        app.loop.start();
      },
      exit: () => app.garage.hide(),
    });
}
