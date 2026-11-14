import type { Action } from '../input/actions';
import type { RunSession } from '../sim/run-session';
import type { ObstacleType } from '../world/entities';
import type { TrackEntity } from '../world/track';

export type TutorialStepId = 'lane' | 'jump' | 'duck' | 'dash';

interface StepSpec {
  id: TutorialStepId;
  obstacle: ObstacleType | null;
  triggerD: number;
  accept: readonly Action[];
}

export const tutorialSteps: readonly StepSpec[] = [
  { id: 'lane', obstacle: 'truck', triggerD: 24, accept: ['left', 'right'] },
  { id: 'jump', obstacle: 'lowBarrier', triggerD: 7.5, accept: ['up'] },
  { id: 'duck', obstacle: 'highSign', triggerD: 7, accept: ['down'] },
  { id: 'dash', obstacle: null, triggerD: 0, accept: ['dash'] },
];

export const TUTORIAL_SLOWMO = 0.3;
const DASH_DELAY_SEC = 1.2;

export interface TutorialEvents {
  show(step: TutorialStepId): void;
  hide(success: boolean): void;
  finish(): void;
}

export class TutorialDirector {
  private index = 0;
  private active = false;
  private entity: TrackEntity | null = null;
  private waitTimer = 0;
  private finished = false;
  timeScale = 1;

  constructor(
    private readonly session: RunSession,
    private readonly events: TutorialEvents,
  ) {}

  get current(): TutorialStepId | null {
    return this.active ? (tutorialSteps[this.index]?.id ?? null) : null;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  update(dt: number): void {
    const target = this.active ? TUTORIAL_SLOWMO : 1;
    this.timeScale += (target - this.timeScale) * Math.min(1, dt * 10);
    if (this.finished || this.session.state !== 'running') {
      if (this.active && this.session.state !== 'running') this.complete(false);
      return;
    }
    const step = tutorialSteps[this.index];
    if (!step) return;
    if (this.active) {
      const entity = this.entity;
      if (entity && (!entity.active || entity.d + entity.spec.length < -1)) this.complete(false);
      return;
    }
    if (step.obstacle === null) {
      this.waitTimer += dt;
      if (this.waitTimer < DASH_DELAY_SEC) return;
      this.session.thrust.fill();
      this.begin(null);
      return;
    }
    const motionX = this.session.motion.x;
    for (const entity of this.session.track.active) {
      if (entity.type !== step.obstacle || entity.d <= 0) continue;
      if (Math.abs(entity.x - motionX) > 1.4) continue;
      if (entity.d > step.triggerD) continue;
      this.begin(entity);
      return;
    }
    if (this.passedWithoutTrigger(step)) {
      this.index += 1;
      this.waitTimer = 0;
      this.checkFinished();
    }
  }

  onAction(action: Action): void {
    const step = tutorialSteps[this.index];
    if (!this.active || !step) return;
    if (step.accept.includes(action)) this.complete(true);
  }

  private passedWithoutTrigger(step: StepSpec): boolean {
    let behind = false;
    for (const e of this.session.track.active) {
      if (e.type !== step.obstacle) continue;
      if (e.d > 0 && e.d < 60) return false;
      if (e.d + e.spec.length < -1) behind = true;
    }
    return behind;
  }

  private begin(entity: TrackEntity | null): void {
    this.active = true;
    this.entity = entity;
    const step = tutorialSteps[this.index];
    if (step) this.events.show(step.id);
  }

  private complete(success: boolean): void {
    this.active = false;
    this.entity = null;
    this.events.hide(success);
    this.index += 1;
    this.waitTimer = 0;
    this.checkFinished();
  }

  private checkFinished(): void {
    if (this.index < tutorialSteps.length || this.finished) return;
    this.finished = true;
    this.events.finish();
  }
}
