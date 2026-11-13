import { Loop } from '../engine/loop';
import { QualityGovernor } from '../engine/quality';
import { Stage } from '../engine/renderer';
import type { Action } from '../input/actions';
import { listenKeyboard } from '../input/keyboard';
import { listenTouch } from '../input/touch-input';
import { patterns } from '../patterns';
import { services } from '../services';
import { RunSession } from '../sim/run-session';
import { DebugOverlay } from '../ui/debug-overlay';
import { GameOverScreen } from '../ui/game-over-screen';
import { Hud } from '../ui/hud';
import { LoadingScreen } from '../ui/loading-screen';
import { MenuScreen } from '../ui/menu-screen';
import { PauseScreen } from '../ui/pause-screen';
import type { WorldView } from '../view/world-view';
import { SequentialSource } from '../world/sequential-source';
import { StateMachine } from './state-machine';
import { registerStates } from './states';

export interface RunResult {
  score: number;
  distance: number;
  newBest: boolean;
}

export class App {
  readonly stage: Stage;
  readonly machine = new StateMachine();
  readonly loop: Loop;
  readonly quality: QualityGovernor;
  readonly session = new RunSession(new SequentialSource(patterns));
  readonly debug: DebugOverlay | null;

  readonly loading: LoadingScreen;
  readonly menu: MenuScreen;
  readonly hud: Hud;
  readonly pauseScreen: PauseScreen;
  readonly gameOver: GameOverScreen;

  view: WorldView | null = null;
  lastResult: RunResult = { score: 0, distance: 0, newBest: false };
  private crashHandled = false;

  constructor(root: HTMLElement) {
    const { i18n } = services();
    this.stage = new Stage(root);
    const ui = this.stage.ui;
    const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    this.debug = debugEnabled ? new DebugOverlay(ui) : null;

    this.loading = new LoadingScreen(ui, i18n);
    this.menu = new MenuScreen(ui, i18n, {
      play: () => this.machine.go('run'),
      toggleSound: () => this.toggleSound(),
      nextLanguage: () => this.nextLanguage(),
    });
    this.hud = new Hud(ui, i18n, () => this.pause());
    this.pauseScreen = new PauseScreen(ui, i18n, {
      resume: () => this.machine.go('run'),
      menu: () => this.machine.go('menu'),
    });
    this.gameOver = new GameOverScreen(ui, i18n, {
      again: () => this.machine.go('run'),
      menu: () => this.machine.go('menu'),
    });

    this.quality = new QualityGovernor((level) => {
      this.stage.setPixelRatioCap(level.pixelRatioCap);
      this.view?.setQuality(level);
    });

    this.loop = new Loop({
      step: (dt) => this.step(dt),
      frame: (dt) => this.frame(dt),
    });

    this.stage.onResize((size) => {
      this.view?.setViewport(size.width, size.height, this.stage.pixelRatio);
    });

    listenTouch(
      this.stage.element,
      () => this.stage.logicalScale,
      (action) => this.input(action),
    );
    listenKeyboard(
      (action) => this.input(action),
      (code) => {
        if (this.debug && code === 'KeyF') this.session.thrust.fill();
        if (code === 'Escape' || code === 'KeyP') this.pause();
      },
    );

    registerStates(this);
  }

  start(): void {
    this.machine.go('boot');
  }

  attachView(view: WorldView): void {
    this.view = view;
    this.session.track.listener = view.track;
    view.setQuality(this.quality.current);
    view.setViewport(this.stage.size.width, this.stage.size.height, this.stage.pixelRatio);
  }

  pause(): void {
    if (this.machine.current === 'run' && this.session.state === 'running') {
      this.machine.go('pause');
    }
  }

  beginRun(): void {
    this.crashHandled = false;
    this.session.reset();
    this.view?.reset();
    this.view?.setMode('run', this.session);
    this.quality.resetTiming();
    this.debug?.resetMin();
  }

  renderMenu(): void {
    const { save } = services();
    this.menu.render({ best: save.data.bestScore, soundEnabled: save.data.soundEnabled });
  }

  private input(action: Action): void {
    if (this.machine.current !== 'run') return;
    this.session.queue(action);
  }

  private step(dt: number): void {
    const state = this.machine.current;
    if (state !== 'run' && state !== 'game-over') return;
    this.session.step(dt);
    if (state !== 'run') return;
    if (this.session.state !== 'running' && !this.crashHandled) {
      this.crashHandled = true;
      this.finishRun();
    }
    if (this.session.state === 'over') this.machine.go('game-over');
  }

  private frame(dt: number): void {
    const view = this.view;
    if (!view) return;
    const state = this.machine.current;
    const inRun = state === 'run' || state === 'game-over';
    if (inRun) {
      view.handleEvents(this.session.events, this.session);
    }
    this.session.events.length = 0;
    view.frame(dt, inRun ? this.session : null);
    this.stage.renderer.render(view.scene, view.rig.camera);

    if (state === 'run') {
      this.hud.render({
        score: this.session.score,
        thrust: this.session.thrust.level,
        droneNear: this.session.drone.isNear,
      });
    }
    this.quality.sample(dt, state === 'run');
    this.debug?.update(dt, this.stage.renderer, {
      fps: this.quality.fps,
      quality: this.quality.level,
      pixelRatio: this.stage.pixelRatio,
      entities: this.session.track.active.length,
      speed: this.session.speed,
      state: `${String(state)}/${this.session.state}`,
    });
  }

  private finishRun(): void {
    const { platform, gameplay, ads, save } = services();
    gameplay.stop();
    platform.levelFail({ level: 'run' });
    ads.markLevelCompleted();
    const score = this.session.score;
    const newBest = score > save.data.bestScore;
    save.update((data) => {
      data.levelsCompleted += 1;
      data.bestScore = Math.max(data.bestScore, score);
    });
    this.lastResult = { score, distance: this.session.distance, newBest };
  }

  private toggleSound(): void {
    const { save, mute } = services();
    const enabled = !save.data.soundEnabled;
    save.set('soundEnabled', enabled);
    mute.set('settings', !enabled);
    this.renderMenu();
  }

  private nextLanguage(): void {
    const { i18n, save } = services();
    const list = i18n.languages;
    const next = list[(list.indexOf(i18n.language) + 1) % list.length] ?? 'en';
    i18n.setLanguage(next);
    save.set('language', next);
    this.renderMenu();
    this.hud.refreshTexts();
  }
}

export function createApp(root: HTMLElement): App {
  const app = new App(root);
  app.start();
  return app;
}
