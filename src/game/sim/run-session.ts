import { crash, drone as droneBalance, score, speedAt, thrust as thrustBalance } from '../balance';
import type { Action } from '../input/actions';
import { InputBuffer } from '../input/input-buffer';
import { Track, type PatternSource, type TrackEntity } from '../world/track';
import { classifyHit, isLightHit, touches, type PlayerPose } from './collision';
import { DroneChaser } from './drone';
import { PlayerMotion, type MotionEvent } from './player-motion';
import { ThrustMeter } from './thrust-meter';

export type SessionEvent =
  | { type: MotionEvent }
  | { type: 'lightHit'; entity: TrackEntity }
  | { type: 'crash'; entity: TrackEntity }
  | { type: 'deco'; entity: TrackEntity };

export type SessionState = 'running' | 'crashed' | 'over';

export class RunSession {
  readonly motion = new PlayerMotion();
  readonly thrust = new ThrustMeter({ chargeSec: thrustBalance.chargeSec });
  readonly drone = new DroneChaser(droneBalance.nearSec);
  readonly track: Track;
  readonly buffer = new InputBuffer(0.15);
  readonly events: SessionEvent[] = [];

  state: SessionState = 'running';
  clock = 0;
  elapsed = 0;
  distance = 0;
  speed = speedAt(0);
  crashTimer = 0;

  private readonly prevPose: PlayerPose = { x: 0, y: 0, height: 0 };
  private readonly pose: PlayerPose = { x: 0, y: 0, height: 0 };

  constructor(source: PatternSource) {
    this.track = new Track(source);
  }

  get score(): number {
    return Math.floor(this.distance * score.pointsPerMeter);
  }

  reset(): void {
    this.motion.reset();
    this.thrust.reset();
    this.drone.reset();
    this.track.reset();
    this.buffer.clear();
    this.events.length = 0;
    this.state = 'running';
    this.clock = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.speed = speedAt(0);
    this.crashTimer = 0;
  }

  queue(action: Action): void {
    if (this.state !== 'running') return;
    this.buffer.push(action, this.clock);
  }

  step(dt: number): void {
    this.clock += dt;
    if (this.state !== 'running') {
      this.stepCrashed(dt);
      return;
    }

    this.elapsed += dt;
    this.speed = speedAt(this.elapsed);

    this.buffer.drain(this.clock, (action) => this.tryPerform(action));
    if (!this.motion.isDashing) this.thrust.tick(dt);

    this.track.update(dt, this.speed, this.elapsed);

    this.prevPose.x = this.motion.x;
    this.prevPose.y = this.motion.y;
    this.prevPose.height = this.motion.height;
    this.prevPose.frontLift = this.motion.frontLift;

    const support = this.track.supportAt(this.motion.x, this.motion.y);
    this.motion.setGround(support.height, support.ramp);
    this.motion.update(dt);
    this.flushMotionEvents();

    this.pose.x = this.motion.x;
    this.pose.y = this.motion.y;
    this.pose.height = this.motion.height;
    this.pose.frontLift = this.motion.frontLift;
    this.resolveCollisions();

    this.drone.update(dt);
    this.distance += this.speed * dt;
  }

  private tryPerform(action: Action): boolean {
    if (!this.motion.canPerform(action, this.thrust.isFull)) return false;
    if (action === 'dash' && !this.thrust.consume()) return false;
    this.motion.perform(action);
    return true;
  }

  private resolveCollisions(): void {
    for (const entity of this.track.active) {
      if (entity.ignored) continue;
      const spec = entity.spec;
      const now = { x: entity.x, d: entity.d };
      if (!spec.solid) {
        if (!entity.touched && touches(this.pose, now, spec)) {
          entity.touched = true;
          this.events.push({ type: 'deco', entity });
        }
        continue;
      }
      const kind = classifyHit(
        this.pose,
        this.prevPose,
        now,
        { x: entity.x, d: entity.prevD },
        spec,
      );
      if (!kind) continue;
      entity.ignored = true;
      if (this.motion.isInvulnerable) continue;
      if (isLightHit(kind) && this.drone.lightHit() === 'warned') {
        this.motion.bounceBack();
        this.flushMotionEvents();
        this.events.push({ type: 'lightHit', entity });
        continue;
      }
      this.crash(entity);
      return;
    }
  }

  private crash(entity: TrackEntity): void {
    this.state = 'crashed';
    this.crashTimer = 0;
    this.buffer.clear();
    this.drone.catchUp();
    this.events.push({ type: 'crash', entity });
  }

  private stepCrashed(dt: number): void {
    this.crashTimer += dt;
    this.speed = Math.max(0, this.speed - this.speed * Math.min(1, 6 * dt));
    this.track.update(dt, this.speed, this.elapsed);
    this.drone.update(dt);
    if (this.state === 'crashed' && this.crashTimer >= crash.gameOverDelaySec) this.state = 'over';
  }

  private flushMotionEvents(): void {
    for (const type of this.motion.events) this.events.push({ type });
    this.motion.events.length = 0;
  }
}
