import { Loop } from '../engine/loop';
import { QualityGovernor } from '../engine/quality';
import { Stage } from '../engine/renderer';
import type { Action } from '../input/actions';
import { listenKeyboard } from '../input/keyboard';
import { listenTouch } from '../input/touch-input';
import { patterns } from '../patterns';
import { services } from '../services';
import type { CarKit } from '../art/breaker-car';
import { playSessionSounds } from '../audio/session-sounds';
import { Sfx } from '../audio/sfx';
import { bonusTypes, revive, type BonusType } from '../balance';
import { findSkin } from '../progression/catalog';
import {
  applyRunResult,
  buyShield,
  buySkin,
  buyUpgrade,
  grantShield,
  selectSkin,
  type RunSummary,
} from '../progression/economy';
import { liveCompleted, missionSet } from '../progression/missions';
import type { GameSave } from '../save';
import { defaultRunConfig, RunSession } from '../sim/run-session';
import { DebugOverlay } from '../ui/debug-overlay';
import { ContinueScreen } from '../ui/continue-screen';
import { GameOverScreen } from '../ui/game-over-screen';
import { GarageScreen } from '../ui/garage-screen';
import { Hud } from '../ui/hud';
import { LoadingScreen } from '../ui/loading-screen';
import { MenuScreen } from '../ui/menu-screen';
import { PauseScreen } from '../ui/pause-screen';
import type { WorldView } from '../view/world-view';
import { TutorialDirector } from '../tutorial/tutorial-director';
import { TutorialHint } from '../ui/tutorial-hint';
import { PatternGenerator, TUTORIAL_TAG } from '../world/pattern-generator';
import { PrefixedSource } from '../world/prefixed-source';
import { randomSeed } from '../world/random';
import { SequentialSource } from '../world/sequential-source';
import type { PatternSource } from '../world/track';
import { StateMachine } from './state-machine';
import { registerStates } from './states';

export interface RunResult {
  score: number;
  distance: number;
  newBest: boolean;
  coins: number;
  missionsDone: number;
  multiplierUp: number | null;
  doubled: boolean;
}

const DEBUG_BONUS_KEYS: Readonly<Record<string, BonusType>> = {
  Digit1: 'fullTank',
  Digit2: 'magnet',
  Digit3: 'double',
  Digit4: 'superJump',
};

export class App {
  readonly stage: Stage;
  readonly machine = new StateMachine();
  readonly loop: Loop;
  readonly quality: QualityGovernor;
  readonly source = new PrefixedSource(createPatternSource());
  readonly session = new RunSession(this.source);
  readonly tutorialHint: TutorialHint;
  private tutorial: TutorialDirector | null = null;
  readonly debug: DebugOverlay | null;

  readonly loading: LoadingScreen;
  readonly menu: MenuScreen;
  readonly hud: Hud;
  readonly pauseScreen: PauseScreen;
  readonly gameOver: GameOverScreen;
  readonly garage: GarageScreen;

  view: WorldView | null = null;
  lastResult: RunResult = {
    score: 0,
    distance: 0,
    newBest: false,
    coins: 0,
    missionsDone: 0,
    multiplierUp: null,
    doubled: false,
  };
  readonly continueScreen: ContinueScreen;
  readonly sfx: Sfx;
  resumeRun = false;
  continueTimer = 0;
  private boostNextRun = false;
  private adBusy = false;
  private liveDone: boolean[] = [];
  private missionCheckTimer = 0;
  private readonly bonusRatios: Record<BonusType, number> = {
    fullTank: 0,
    magnet: 0,
    double: 0,
    superJump: 0,
  };
  private crashHandled = false;
  private runFinalized = true;

  constructor(root: HTMLElement) {
    const { i18n, audio } = services();
    this.sfx = new Sfx(audio);
    this.stage = new Stage(root);
    const ui = this.stage.ui;
    ui.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('button')) this.sfx.play('click');
    });
    const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    this.debug = debugEnabled ? new DebugOverlay(ui) : null;

    this.loading = new LoadingScreen(ui, i18n);
    this.menu = new MenuScreen(ui, i18n, {
      play: () => this.machine.go('run'),
      boostedStart: () => this.boostedStart(),
      garage: () => this.machine.go('garage'),
      toggleSound: () => this.toggleSound(),
      nextLanguage: () => this.nextLanguage(),
    });
    this.hud = new Hud(
      ui,
      i18n,
      () => this.pause(),
      () => this.input('shield'),
    );
    this.pauseScreen = new PauseScreen(ui, i18n, {
      resume: () => this.machine.go('run'),
      menu: () => this.machine.go('menu'),
    });
    this.gameOver = new GameOverScreen(ui, i18n, {
      again: () => this.machine.go('run'),
      menu: () => this.backToMenu(),
      doubleCoins: () => this.doubleCoins(),
    });
    const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    this.tutorialHint = new TutorialHint(ui, i18n, touch);
    this.continueScreen = new ContinueScreen(ui, i18n, {
      watch: () => this.watchToContinue(),
      skip: () => this.declineContinue(),
    });

    this.garage = new GarageScreen(ui, i18n, {
      buyUpgrade: (kind) => this.purchase((data) => buyUpgrade(data, kind)),
      buySkin: (id) => this.purchase((data) => buySkin(data, id)),
      selectSkin: (id) => this.purchase((data) => selectSkin(data, id)),
      buyShield: () => this.purchase((data) => buyShield(data)),
      back: () => this.machine.go('menu'),
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
        if (this.debug && code === 'KeyG') this.debugGrantShield();
        if (this.debug && code === 'KeyC') this.purchase((data) => void (data.coins += 1000));
        const bonus = DEBUG_BONUS_KEYS[code];
        if (this.debug && bonus && this.machine.current === 'run')
          this.session.activateBonus(bonus);
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
    this.applyLook();
  }

  applyLook(): void {
    const skins = services().save.data.skins;
    const kitId = skins.kit.replace('kit.', '');
    const kit: CarKit =
      kitId === 'aero' || kitId === 'blade' || kitId === 'rally' ? kitId : 'stock';
    this.view?.setLook({
      neon: skinColor(skins.neon, 0x22e6ff),
      kit,
      flame: skinColor(skins.flame, 0xff6a1a),
    });
  }

  renderGarage(): void {
    this.garage.render(services().save.data);
  }

  pause(): void {
    if (this.machine.current === 'run' && this.session.state === 'running') {
      this.machine.go('pause');
    }
  }

  beginRun(): void {
    this.crashHandled = false;
    this.runFinalized = false;
    const data = services().save.data;
    const boosted = this.boostNextRun;
    this.boostNextRun = false;
    this.setupTutorial(!data.tutorialDone && !isPatternForced());
    this.session.reset({
      ...defaultRunConfig,
      seed: randomSeed(),
      startShield: boosted,
      startWithFullThrust: boosted,
      shields: data.shields,
      scoreMultiplier: data.multiplier,
      thrustLevel: data.upgrades.thrust,
      upgrades: {
        fullTank: data.upgrades.fullTank,
        magnet: data.upgrades.magnet,
        double: data.upgrades.double,
        superJump: data.upgrades.superJump,
      },
    });
    this.liveDone = [...data.missions.done];
    this.missionCheckTimer = 0;
    this.view?.reset();
    this.view?.setMode('run', this.session);
    this.quality.resetTiming();
    this.debug?.resetMin();
  }

  renderMenu(): void {
    const { data } = services().save;
    this.menu.render({
      best: data.bestScore,
      coins: data.coins,
      soundEnabled: data.soundEnabled,
      missions: data.missions,
      multiplier: data.multiplier,
    });
  }

  private setupTutorial(enabled: boolean): void {
    this.tutorialHint.hide();
    const lesson = patterns.find((p) => p.tags.includes(TUTORIAL_TAG));
    if (!enabled || !lesson) {
      this.source.setPrefix([]);
      this.tutorial = null;
      return;
    }
    this.source.setPrefix([lesson]);
    const { i18n, save } = services();
    this.tutorial = new TutorialDirector(this.session, {
      show: (step) => this.tutorialHint.show(step),
      hide: (success) => {
        this.tutorialHint.hide();
        if (!success) return;
        this.sfx.play('mission');
        this.tutorialHint.praise(i18n.t('tutorial.good'));
      },
      finish: () => {
        save.set('tutorialDone', true);
        window.setTimeout(() => this.tutorialHint.praise(i18n.t('tutorial.done')), 900);
      },
    });
  }

  private input(action: Action): void {
    if (this.machine.current !== 'run') return;
    this.tutorial?.onAction(action);
    this.session.queue(action);
  }

  private step(dt: number): void {
    const state = this.machine.current;
    if (state !== 'run' && state !== 'game-over') return;
    this.session.step(dt * (state === 'run' ? (this.tutorial?.timeScale ?? 1) : 1));
    if (state !== 'run') return;
    if (this.session.state !== 'running' && !this.crashHandled) {
      this.crashHandled = true;
      services().gameplay.stop();
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
      playSessionSounds(this.sfx, this.session.events, this.session);
    }
    this.session.events.length = 0;
    this.sfx.update(dt, {
      speed: this.session.speed,
      running: state === 'run' && this.session.state === 'running',
      dashing: this.session.motion.isDashing,
      droneNear: this.session.drone.isNear,
    });
    this.tickContinue(dt);
    view.frame(dt, inRun ? this.session : null);
    this.stage.renderer.render(view.scene, view.rig.camera);

    if (state === 'run') {
      const session = this.session;
      for (const type of bonusTypes) {
        this.bonusRatios[type] = session.bonusTimers[type] / session.bonusLengths[type];
      }
      this.hud.render({
        score: session.score,
        coins: session.coins,
        thrust: session.thrust.level,
        droneNear: session.drone.isNear,
        multiplier: session.scoreMultiplier,
        bonuses: this.bonusRatios,
        shields: session.shields,
        shieldLeft: session.shieldTimer,
      });
      this.checkMissions(dt);
      this.tutorial?.update(dt);
    } else {
      this.tutorialHint.hide();
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

  get canOfferContinue(): boolean {
    return this.session.canRevive;
  }

  offerContinue(): void {
    this.continueTimer = revive.offerSec;
    this.continueScreen.render(revive.maxPerRun - this.session.revives);
    this.continueScreen.show();
  }

  showResults(): void {
    this.finalizeRun();
    const { save } = services();
    this.continueScreen.hide();
    this.gameOver.render({ ...this.lastResult, best: save.data.bestScore });
    this.gameOver.show();
  }

  finalizeRun(): void {
    if (this.runFinalized) return;
    this.runFinalized = true;
    this.finishRun();
  }

  private tickContinue(dt: number): void {
    if (!this.continueScreen.visible || this.adBusy) return;
    this.continueTimer -= dt;
    this.continueScreen.setProgress(this.continueTimer / revive.offerSec);
    if (this.continueTimer <= 0) this.declineContinue();
  }

  private watchToContinue(): void {
    if (this.adBusy || !this.continueScreen.visible || this.machine.current !== 'game-over') return;
    this.adBusy = true;
    this.continueScreen.setBusy(true);
    void services()
      .ads.showRewarded()
      .then((rewarded) => {
        this.adBusy = false;
        if (this.machine.current !== 'game-over' || !this.continueScreen.visible) return;
        if (rewarded && this.session.revive()) {
          this.continueScreen.hide();
          this.crashHandled = false;
          this.resumeRun = true;
          this.machine.go('run');
          return;
        }
        this.continueScreen.setBusy(false);
        this.continueScreen.showUnavailable();
        this.continueTimer = Math.max(this.continueTimer, 2.5);
      });
  }

  private declineContinue(): void {
    if (this.adBusy || !this.continueScreen.visible) return;
    this.showResults();
  }

  private doubleCoins(): void {
    if (this.adBusy || !this.gameOver.visible) return;
    if (this.lastResult.doubled || this.lastResult.coins <= 0) return;
    this.adBusy = true;
    this.gameOver.setBusy(true);
    void services()
      .ads.showRewarded()
      .then((rewarded) => {
        this.adBusy = false;
        if (rewarded && !this.lastResult.doubled) {
          const bonus = this.lastResult.coins;
          services().save.update((data) => {
            data.coins += bonus;
          });
          this.lastResult = { ...this.lastResult, doubled: true, coins: bonus * 2 };
          this.gameOver.updateCoins(this.lastResult.coins);
        }
        const { save } = services();
        this.gameOver.render({ ...this.lastResult, best: save.data.bestScore });
      });
  }

  private backToMenu(): void {
    if (this.adBusy) return;
    this.adBusy = true;
    this.gameOver.setBusy(true);
    void services()
      .ads.showInterstitial()
      .finally(() => {
        this.adBusy = false;
        if (this.machine.current === 'game-over') this.machine.go('menu');
      });
  }

  private boostedStart(): void {
    if (this.adBusy || this.machine.current !== 'menu') return;
    this.adBusy = true;
    this.menu.setBusy(true);
    void services()
      .ads.showRewarded()
      .then((rewarded) => {
        this.adBusy = false;
        if (this.machine.current !== 'menu') return;
        if (rewarded) {
          this.boostNextRun = true;
          this.machine.go('run');
        } else {
          this.renderMenu();
        }
      });
  }

  private finishRun(): void {
    const { platform, gameplay, ads, save } = services();
    gameplay.stop();
    platform.levelFail({ level: 'run' });
    ads.markLevelCompleted();
    const session = this.session;
    const holder: { summary: RunSummary | null } = { summary: null };
    save.update((data) => {
      holder.summary = applyRunResult(data, {
        score: session.score,
        coins: session.coins,
        shieldsLeft: session.shields,
        metrics: session.metrics,
      });
    });
    const result = holder.summary;
    this.lastResult = {
      score: session.score,
      distance: session.distance,
      newBest: result?.newBest ?? false,
      coins: session.coins,
      missionsDone: result?.completedMissions.length ?? 0,
      multiplierUp: result?.multiplierUp ? result.multiplier : null,
      doubled: false,
    };
  }

  private checkMissions(dt: number): void {
    this.missionCheckTimer -= dt;
    if (this.missionCheckTimer > 0) return;
    this.missionCheckTimer = 0.3;
    const { save, i18n } = services();
    const missions = save.data.missions;
    const done = liveCompleted(missions, this.session.metrics);
    const specs = missionSet(missions.set);
    done.forEach((isDone, index) => {
      if (!isDone || this.liveDone[index]) return;
      this.liveDone[index] = true;
      const spec = specs[index];
      if (!spec) return;
      this.sfx.play('mission');
      this.hud.showToast(
        i18n.t('hud.missionDone'),
        i18n.t(`mission.${spec.metric}.${spec.scope}`, { n: spec.target }),
      );
    });
  }

  private purchase(action: (data: GameSave) => unknown): void {
    services().save.update((data) => {
      action(data);
    });
    this.renderGarage();
    this.applyLook();
  }

  private debugGrantShield(): void {
    if (this.machine.current === 'run') this.session.shields += 1;
    else this.purchase((data) => grantShield(data));
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

function skinColor(id: string, fallback: number): number {
  return findSkin(id)?.color ?? fallback;
}

function isPatternForced(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1' && params.get('pattern') !== null;
}

function createPatternSource(): PatternSource {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('debug') === '1' ? params.get('pattern') : null;
  const only = forced ? patterns.filter((p) => p.id === forced) : [];
  if (only.length > 0) return new SequentialSource(only);
  if (forced) console.warn(`[debug] unknown pattern "${forced}"`);
  return new PatternGenerator(patterns);
}

export function createApp(root: HTMLElement): App {
  const app = new App(root);
  app.start();
  return app;
}
