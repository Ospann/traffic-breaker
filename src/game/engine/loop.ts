export interface LoopHandlers {
  step(dt: number): void;
  frame(frameDt: number): void;
}

export const FIXED_DT = 1 / 120;
const MAX_FRAME_DT = 0.1;

export class Loop {
  private handle: number | null = null;
  private last = 0;
  private accumulator = 0;

  constructor(private readonly handlers: LoopHandlers) {}

  get running(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.handle !== null) return;
    this.last = performance.now();
    this.accumulator = 0;
    this.handle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.handle === null) return;
    cancelAnimationFrame(this.handle);
    this.handle = null;
  }

  private readonly tick = (now: number): void => {
    this.handle = requestAnimationFrame(this.tick);
    const frameDt = Math.min((now - this.last) / 1000, MAX_FRAME_DT);
    this.last = now;
    this.accumulator += frameDt;
    while (this.accumulator >= FIXED_DT) {
      this.handlers.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    this.handlers.frame(frameDt);
  };
}
