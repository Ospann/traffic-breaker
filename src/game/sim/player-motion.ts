import { jumpGravity, jumpVelocity, LANE_WIDTH, LANES, player, thrust } from '../balance';
import type { Action } from '../input/actions';

export type MotionEvent =
  | 'laneChange'
  | 'jump'
  | 'land'
  | 'duck'
  | 'fastDrop'
  | 'dashStart'
  | 'dashEnd'
  | 'bounce';

export type VerticalMode = 'ground' | 'air' | 'dash' | 'descend';

export function laneX(lane: number): number {
  return (lane - (LANES - 1) / 2) * LANE_WIDTH;
}

export interface MotionTuning {
  jumpVelocity: number;
  gravity: number;
}

export class PlayerMotion {
  lane = 1;
  prevLane = 1;
  x = laneX(1);
  private laneFromX = laneX(1);
  private laneT = 1;

  y = 0;
  vy = 0;
  groundY = 0;
  mode: VerticalMode = 'ground';
  duckTimer = 0;
  dashTimer = 0;
  invulnTimer = 0;
  private slamPending = false;
  private dashRiseFrom = 0;

  readonly events: MotionEvent[] = [];
  tuning: MotionTuning = { jumpVelocity, gravity: jumpGravity };

  reset(): void {
    this.lane = 1;
    this.prevLane = 1;
    this.x = laneX(1);
    this.laneFromX = this.x;
    this.laneT = 1;
    this.y = 0;
    this.vy = 0;
    this.groundY = 0;
    this.mode = 'ground';
    this.duckTimer = 0;
    this.dashTimer = 0;
    this.invulnTimer = 0;
    this.slamPending = false;
    this.events.length = 0;
  }

  get isChangingLane(): boolean {
    return this.laneT < 1;
  }

  get isDucking(): boolean {
    return this.duckTimer > 0 && this.mode === 'ground';
  }

  get isGrounded(): boolean {
    return this.mode === 'ground';
  }

  get isDashing(): boolean {
    return this.mode === 'dash';
  }

  get isInvulnerable(): boolean {
    return this.mode === 'dash' || this.mode === 'descend' || this.invulnTimer > 0;
  }

  get height(): number {
    return this.isDucking ? player.duckHeight : player.height;
  }

  canPerform(action: Action, thrustFull: boolean): boolean {
    if (action === 'left') return this.lane > 0;
    if (action === 'right') return this.lane < LANES - 1;
    if (action === 'up') return this.mode === 'ground';
    if (action === 'down') return this.mode === 'ground' || this.mode === 'air';
    if (action === 'dash') return thrustFull && this.mode !== 'dash' && this.mode !== 'descend';
    return false;
  }

  perform(action: Action): void {
    switch (action) {
      case 'left':
        this.changeLane(this.lane - 1);
        return;
      case 'right':
        this.changeLane(this.lane + 1);
        return;
      case 'up':
        this.jump();
        return;
      case 'down':
        if (this.mode === 'air') {
          this.vy = Math.min(this.vy, -player.fastDropSpeed);
          this.slamPending = true;
          this.events.push('fastDrop');
        } else {
          this.duckTimer = player.duckSec;
          this.events.push('duck');
        }
        return;
      case 'dash':
        this.mode = 'dash';
        this.dashTimer = thrust.dashSec;
        this.dashRiseFrom = this.y;
        this.duckTimer = 0;
        this.vy = 0;
        this.events.push('dashStart');
        return;
      case 'shield':
        return;
    }
  }

  bounceBack(): void {
    const target = this.prevLane === this.lane ? this.nearestLane() : this.prevLane;
    this.laneFromX = this.x;
    this.lane = target;
    this.prevLane = target;
    this.laneT = 0;
    this.events.push('bounce');
  }

  grantInvulnerability(sec: number): void {
    this.invulnTimer = Math.max(this.invulnTimer, sec);
  }

  update(dt: number): void {
    this.updateLane(dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);

    switch (this.mode) {
      case 'ground':
        this.duckTimer = Math.max(0, this.duckTimer - dt);
        if (this.groundY < this.y - 0.01) {
          this.mode = 'air';
          this.vy = 0;
        } else {
          this.y = this.groundY;
        }
        break;
      case 'air':
        this.y += this.vy * dt - 0.5 * this.tuning.gravity * dt * dt;
        this.vy -= this.tuning.gravity * dt;
        if (this.y <= this.groundY && this.vy <= 0) this.land();
        break;
      case 'dash': {
        this.dashTimer -= dt;
        const risen = thrust.dashSec - this.dashTimer;
        const k = Math.min(risen / thrust.dashRiseSec, 1);
        const eased = 1 - (1 - k) ** 3;
        this.y = this.dashRiseFrom + (thrust.dashAltitude - this.dashRiseFrom) * eased;
        if (this.dashTimer <= 0) {
          this.mode = 'descend';
          this.events.push('dashEnd');
        }
        break;
      }
      case 'descend': {
        const gap = this.y - this.groundY;
        const step = Math.max(thrust.descendSpeed * dt, gap * 4 * dt);
        this.y = Math.max(this.groundY, this.y - Math.min(step, gap));
        if (this.y <= this.groundY + 0.001) {
          this.y = this.groundY;
          this.mode = 'ground';
          this.vy = 0;
          this.invulnTimer = thrust.landingInvulnSec;
          this.events.push('land');
        }
        break;
      }
    }
  }

  private land(): void {
    this.y = this.groundY;
    this.vy = 0;
    this.mode = 'ground';
    this.events.push('land');
    if (this.slamPending) {
      this.slamPending = false;
      this.duckTimer = player.duckSec;
      this.events.push('duck');
    }
  }

  private jump(): void {
    this.duckTimer = 0;
    this.slamPending = false;
    this.mode = 'air';
    this.vy = this.tuning.jumpVelocity;
    this.events.push('jump');
  }

  private changeLane(target: number): void {
    this.prevLane = this.lane;
    this.lane = target;
    this.laneFromX = this.x;
    this.laneT = 0;
    this.events.push('laneChange');
  }

  private updateLane(dt: number): void {
    if (this.laneT >= 1) {
      this.x = laneX(this.lane);
      return;
    }
    this.laneT = Math.min(1, this.laneT + dt / player.laneChangeSec);
    const k = this.laneT;
    const eased = k * k * (3 - 2 * k);
    this.x = this.laneFromX + (laneX(this.lane) - this.laneFromX) * eased;
    if (this.laneT >= 1) this.prevLane = this.lane;
  }

  private nearestLane(): number {
    const raw = Math.round(this.x / LANE_WIDTH + (LANES - 1) / 2);
    return Math.min(Math.max(raw, 0), LANES - 1);
  }
}
