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
  const data = await save.load();
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
  let resumeRun = false;

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
        if (from === 'pause') services().platform.levelFail({ level: 'run' });
        app.view?.reset();
        app.view?.setMode('menu', null);
        app.renderMenu();
        app.menu.show();
        app.loop.start();
      },
      exit: () => app.menu.hide(),
    })
    .register('run', {
      enter: () => {
        const { gameplay, platform } = services();
        if (!resumeRun) {
          app.beginRun();
          platform.levelStart({ level: 'run' });
        }
        resumeRun = false;
        app.hud.refreshTexts();
        app.hud.show();
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
        if (to === 'run') resumeRun = true;
        else app.hud.hide();
      },
    })
    .register('game-over', {
      enter: () => {
        const { save } = services();
        app.gameOver.render({ ...app.lastResult, best: save.data.bestScore });
        app.gameOver.show();
      },
      exit: () => app.gameOver.hide(),
    })
    .register('garage', {
      enter: () => app.machine.go('menu'),
    });
}
