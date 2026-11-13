import {
  bonusDuration,
  bonusTypes,
  coins as coinBalance,
  crash,
  drone as droneBalance,
  jumpGravity,
  jumpVelocity,
  score,
  shield as shieldBalance,
  speedAt,
  superJumpGravity,
  superJumpVelocity,
  thrustChargeSec,
  type BonusType,
} from '../balance';
import type { Action } from '../input/actions';
import { InputBuffer } from '../input/input-buffer';
import type { RunMetrics } from '../progression/missions';
import type { Bonus } from '../world/pickups';
import { Track, type PatternSource, type TrackEntity } from '../world/track';
import { classifyHit, isLightHit, overlapsFootprint, touches, type PlayerPose } from './collision';
import { DroneChaser } from './drone';
import { PlayerMotion, type MotionEvent, type MotionTuning } from './player-motion';
import { ThrustMeter } from './thrust-meter';

export type SessionEvent =
  | { type: MotionEvent }
  | { type: 'lightHit'; entity: TrackEntity }
  | { type: 'crash'; entity: TrackEntity }
  | { type: 'deco'; entity: TrackEntity }
  | { type: 'coin'; streak: number; x: number; y: number }
  | { type: 'bonus'; bonus: BonusType }
  | { type: 'bonusEnd'; bonus: BonusType }
  | { type: 'shieldOn' }
  | { type: 'shieldSave' }
  | { type: 'shieldEnd' };

export type SessionState = 'running' | 'crashed' | 'over';

export interface RunConfig {
  seed: number;
  upgrades: Readonly<Record<BonusType, number>>;
  thrustLevel: number;
  shields: number;
  scoreMultiplier: number;
  startWithFullThrust: boolean;
}

export const defaultRunConfig: RunConfig = {
  seed: 1,
  upgrades: { fullTank: 0, magnet: 0, double: 0, superJump: 0 },
  thrustLevel: 0,
  shields: 0,
  scoreMultiplier: 1,
  startWithFullThrust: false,
};

const normalTuning: MotionTuning = { jumpVelocity, gravity: jumpGravity };
const superTuning: MotionTuning = { jumpVelocity: superJumpVelocity, gravity: superJumpGravity };

export interface RunStats {
  jumps: number;
  ducks: number;
  dashes: number;
  roofs: number;
  bonuses: number;
  lightHits: number;
  shieldsUsed: number;
  barriersJumped: number;
  ducksUnder: number;
  rampLaunches: number;
}

function emptyStats(): RunStats {
  return {
    jumps: 0,
    ducks: 0,
    dashes: 0,
    roofs: 0,
    bonuses: 0,
    lightHits: 0,
    shieldsUsed: 0,
    barriersJumped: 0,
    ducksUnder: 0,
    rampLaunches: 0,
  };
}

export class RunSession {
  readonly motion = new PlayerMotion();
  readonly thrust = new ThrustMeter({ chargeSec: thrustChargeSec(0) });
  readonly drone = new DroneChaser(droneBalance.nearSec);
  readonly track: Track;
  readonly buffer = new InputBuffer(0.15);
  readonly events: SessionEvent[] = [];
  readonly bonusTimers: Record<BonusType, number> = {
    fullTank: 0,
    magnet: 0,
    double: 0,
    superJump: 0,
  };
  readonly bonusLengths: Record<BonusType, number> = {
    fullTank: 1,
    magnet: 1,
    double: 1,
    superJump: 1,
  };

  config: RunConfig = defaultRunConfig;
  state: SessionState = 'running';
  clock = 0;
  elapsed = 0;
  distance = 0;
  speed = speedAt(0);
  crashTimer = 0;
  coins = 0;
  coinStreak = 0;
  shields = 0;
  shieldTimer = 0;
  stats: RunStats = emptyStats();

  private points = 0;
  private streakTimer = 0;
  private onRoof = false;
  private readonly prevPose: PlayerPose = { x: 0, y: 0, height: 0 };
  private readonly pose: PlayerPose = { x: 0, y: 0, height: 0 };

  constructor(source: PatternSource) {
    this.track = new Track(source);
  }

  get score(): number {
    return Math.floor(this.points);
  }

  get scoreMultiplier(): number {
    return this.config.scoreMultiplier * (this.bonusTimers.double > 0 ? 2 : 1);
  }

  get shieldActive(): boolean {
    return this.shieldTimer > 0;
  }

  reset(config: RunConfig = this.config): void {
    this.config = config;
    this.motion.reset();
    this.motion.tuning = normalTuning;
    this.thrust.reset();
    this.thrust.setChargeSec(thrustChargeSec(config.thrustLevel));
    if (config.startWithFullThrust) this.thrust.fill();
    this.drone.reset();
    this.track.reset(config.seed);
    this.buffer.clear();
    this.events.length = 0;
    this.state = 'running';
    this.clock = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.speed = speedAt(0);
    this.crashTimer = 0;
    this.points = 0;
    this.coins = 0;
    this.coinStreak = 0;
    this.streakTimer = 0;
    this.shields = config.shields;
    this.shieldTimer = 0;
    this.onRoof = false;
    this.stats = emptyStats();
    for (const type of bonusTypes) {
      this.bonusTimers[type] = 0;
      this.bonusLengths[type] = bonusDuration(type, config.upgrades[type]);
    }
  }

  queue(action: Action): void {
    if (this.state !== 'running') return;
    this.buffer.push(action, this.clock);
  }

  activateBonus(type: BonusType): void {
    const duration = bonusDuration(type, this.config.upgrades[type]);
    this.bonusLengths[type] = duration;
    this.bonusTimers[type] = duration;
    this.stats.bonuses += 1;
    this.events.push({ type: 'bonus', bonus: type });
    if (type === 'fullTank') {
      this.thrust.fill();
      this.motion.startDash(duration);
      this.flushMotionEvents();
      this.track.pickups.spawnAirTrail(0, this.speed * duration, this.motion.lane);
    }
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
    this.updateTimers(dt);

    this.track.update(dt, this.speed, this.elapsed);

    this.prevPose.x = this.motion.x;
    this.prevPose.y = this.motion.y;
    this.prevPose.height = this.motion.height;
    this.prevPose.frontLift = this.motion.frontLift;

    const support = this.track.supportAt(this.motion.x, this.motion.y);
    this.motion.setGround(support.height, support.ramp);
    if (this.motion.isGrounded) {
      this.motion.tuning = this.bonusTimers.superJump > 0 ? superTuning : normalTuning;
    }
    this.motion.update(dt);
    this.flushMotionEvents();
    this.trackRoof();

    this.pose.x = this.motion.x;
    this.pose.y = this.motion.y;
    this.pose.height = this.motion.height;
    this.pose.frontLift = this.motion.frontLift;
    this.resolveCollisions();
    if (this.state !== 'running') return;

    this.collectPickups(dt);
    this.drone.update(dt);
    const travelled = this.speed * dt;
    this.distance += travelled;
    this.points += travelled * score.pointsPerMeter * this.scoreMultiplier;
  }

  private updateTimers(dt: number): void {
    for (const type of bonusTypes) {
      const left = this.bonusTimers[type];
      if (left <= 0) continue;
      this.bonusTimers[type] = Math.max(0, left - dt);
      if (this.bonusTimers[type] === 0) this.events.push({ type: 'bonusEnd', bonus: type });
    }
    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - dt);
      if (this.shieldTimer === 0) this.events.push({ type: 'shieldEnd' });
    }
    if (this.streakTimer > 0) {
      this.streakTimer -= dt;
      if (this.streakTimer <= 0) this.coinStreak = 0;
    }
  }

  private tryPerform(action: Action): boolean {
    if (action === 'shield') return this.activateShield();
    if (!this.motion.canPerform(action, this.thrust.isFull)) return false;
    if (action === 'dash' && !this.thrust.consume()) return false;
    this.motion.perform(action);
    if (action === 'up') this.stats.jumps += 1;
    else if (action === 'down' && this.motion.isDucking) this.stats.ducks += 1;
    else if (action === 'dash') this.stats.dashes += 1;
    return true;
  }

  private activateShield(): boolean {
    if (this.shields <= 0 || this.shieldActive) return false;
    this.shields -= 1;
    this.stats.shieldsUsed += 1;
    this.shieldTimer = shieldBalance.durationSec;
    this.events.push({ type: 'shieldOn' });
    return true;
  }

  private trackRoof(): void {
    const roof = this.motion.isGrounded && this.motion.groundY > 0.5 && !this.motion.onRamp;
    if (roof && !this.onRoof) this.stats.roofs += 1;
    this.onRoof = roof;
  }

  private collectPickups(dt: number): void {
    const pickups = this.track.pickups;
    const px = this.motion.x;
    const py = this.motion.y + 0.55;
    const magnet = this.bonusTimers.magnet > 0;
    const pull = coinBalance.magnetPullSpeed * dt;
    for (let i = pickups.coins.length - 1; i >= 0; i -= 1) {
      const coin = pickups.coins[i];
      if (!coin) continue;
      if (
        magnet &&
        !coin.pulled &&
        coin.d < coinBalance.magnetRangeAhead &&
        coin.d > -1 &&
        Math.abs(coin.x - px) < coinBalance.magnetRangeX
      ) {
        coin.pulled = true;
      }
      if (coin.pulled) {
        const dx = px - coin.x;
        const dy = py - coin.y;
        const dz = -coin.d;
        const distance = Math.hypot(dx, dy, dz);
        const k = distance > pull ? pull / distance : 1;
        coin.x += dx * k;
        coin.y += dy * k;
        coin.d += dz * k;
      }
      if (
        Math.abs(coin.d) < coinBalance.collectHalfZ &&
        Math.abs(coin.x - px) < coinBalance.collectHalfX &&
        coin.y > py - 1.2 &&
        coin.y < py + 1.4
      ) {
        this.collectCoin(coin.x, coin.y);
        pickups.removeCoinAt(i);
      }
    }
    for (let i = pickups.bonuses.length - 1; i >= 0; i -= 1) {
      const bonus = pickups.bonuses[i];
      if (!bonus || !this.reaches(bonus, px, py)) continue;
      pickups.removeBonusAt(i);
      this.activateBonus(bonus.type);
    }
  }

  private reaches(bonus: Bonus, px: number, py: number): boolean {
    return (
      Math.abs(bonus.d) < coinBalance.collectHalfZ + 0.3 &&
      Math.abs(bonus.x - px) < coinBalance.collectHalfX + 0.2 &&
      bonus.y > py - 1.4 &&
      bonus.y < py + 1.6
    );
  }

  private collectCoin(x: number, y: number): void {
    this.coins += 1;
    this.coinStreak += 1;
    this.streakTimer = coinBalance.streakWindowSec;
    this.points += coinBalance.points * this.scoreMultiplier;
    if (!this.motion.isDashing) this.thrust.add(coinBalance.thrustCharge);
    this.events.push({ type: 'coin', streak: this.coinStreak, x, y });
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
      if (!kind) {
        this.noteClearance(entity);
        continue;
      }
      entity.ignored = true;
      if (this.motion.isInvulnerable) continue;
      if (isLightHit(kind) && this.drone.lightHit() === 'warned') {
        this.stats.lightHits += 1;
        this.motion.bounceBack();
        this.flushMotionEvents();
        this.events.push({ type: 'lightHit', entity });
        continue;
      }
      if (this.shieldActive) {
        this.saveWithShield(entity);
        continue;
      }
      this.crash(entity);
      return;
    }
  }

  private noteClearance(entity: TrackEntity): void {
    if (entity.cleared || entity.spec.roof) return;
    if (!overlapsFootprint(this.pose, { x: entity.x, d: entity.d }, entity.spec)) return;
    const type = entity.type;
    const airborne = this.motion.mode === 'air';
    if (airborne && (type === 'lowBarrier' || type === 'midBarrier')) {
      entity.cleared = true;
      this.stats.barriersJumped += 1;
    } else if (this.motion.isDucking && (type === 'highSign' || type === 'midBarrier')) {
      entity.cleared = true;
      this.stats.ducksUnder += 1;
    }
  }

  get metrics(): RunMetrics {
    return {
      coins: this.coins,
      distance: Math.floor(this.distance),
      score: this.score,
      jumps: this.stats.jumps,
      barriersJumped: this.stats.barriersJumped,
      ducksUnder: this.stats.ducksUnder,
      dashes: this.stats.dashes,
      roofs: this.stats.roofs,
      rampLaunches: this.stats.rampLaunches,
      bonuses: this.stats.bonuses,
    };
  }

  private saveWithShield(entity: TrackEntity): void {
    this.shieldTimer = 0;
    this.motion.grantInvulnerability(shieldBalance.saveInvulnSec);
    if (this.motion.isChangingLane) this.motion.bounceBack();
    this.flushMotionEvents();
    this.events.push({ type: 'shieldSave' });
    this.events.push({ type: 'lightHit', entity });
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
    for (const type of this.motion.events) {
      if (type === 'rampLaunch') this.stats.rampLaunches += 1;
      this.events.push({ type });
    }
    this.motion.events.length = 0;
  }
}
