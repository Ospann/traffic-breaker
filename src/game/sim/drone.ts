export type LightHitOutcome = 'warned' | 'caught';

export class DroneChaser {
  private nearTimer = 0;
  proximity = 0;

  constructor(private readonly nearSec: number) {}

  get isNear(): boolean {
    return this.nearTimer > 0;
  }

  lightHit(): LightHitOutcome {
    if (this.isNear) return 'caught';
    this.nearTimer = this.nearSec;
    return 'warned';
  }

  catchUp(): void {
    this.nearTimer = Math.max(this.nearTimer, this.nearSec);
  }

  update(dt: number): void {
    this.nearTimer = Math.max(0, this.nearTimer - dt);
    const target = this.isNear ? 1 : 0;
    const rate = this.isNear ? 4 : 1.2;
    this.proximity += (target - this.proximity) * Math.min(1, rate * dt);
  }

  reset(): void {
    this.nearTimer = 0;
    this.proximity = 0;
  }
}
