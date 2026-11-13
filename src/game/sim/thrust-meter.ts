export interface ThrustMeterOptions {
  chargeSec: number;
}

export class ThrustMeter {
  private value = 0;
  private chargeSec: number;

  constructor(options: ThrustMeterOptions) {
    this.chargeSec = options.chargeSec;
  }

  get level(): number {
    return this.value;
  }

  get isFull(): boolean {
    return this.value >= 1;
  }

  setChargeSec(sec: number): void {
    this.chargeSec = Math.max(sec, 0.1);
  }

  tick(dt: number): void {
    this.add(dt / this.chargeSec);
  }

  add(amount: number): void {
    this.value = Math.min(1, Math.max(0, this.value + amount));
  }

  fill(): void {
    this.value = 1;
  }

  consume(): boolean {
    if (!this.isFull) return false;
    this.value = 0;
    return true;
  }

  reset(): void {
    this.value = 0;
  }
}
