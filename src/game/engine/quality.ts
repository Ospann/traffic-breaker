export interface QualityLevel {
  pixelRatioCap: number;
  viewDistance: number;
  particles: number;
}

const topLevel: QualityLevel = { pixelRatioCap: 2, viewDistance: 170, particles: 1 };

export const qualityLevels: readonly QualityLevel[] = [
  topLevel,
  { pixelRatioCap: 1.5, viewDistance: 150, particles: 0.8 },
  { pixelRatioCap: 1.25, viewDistance: 130, particles: 0.6 },
  { pixelRatioCap: 1, viewDistance: 115, particles: 0.45 },
  { pixelRatioCap: 0.8, viewDistance: 100, particles: 0.3 },
];

export interface QualityOptions {
  targetFps: number;
  sustainSec: number;
  settleSec: number;
}

export class QualityGovernor {
  private levelIndex = 0;
  private lowFor = 0;
  private settle: number;
  private windowTime = 0;
  private windowFrames = 0;
  fps = 60;

  constructor(
    private readonly apply: (level: QualityLevel, index: number) => void,
    private readonly options: QualityOptions = { targetFps: 50, sustainSec: 3, settleSec: 3 },
  ) {
    this.settle = options.settleSec;
  }

  get level(): number {
    return this.levelIndex;
  }

  get current(): QualityLevel {
    return qualityLevels[this.levelIndex] ?? topLevel;
  }

  init(): void {
    this.apply(this.current, this.levelIndex);
  }

  resetTiming(): void {
    this.lowFor = 0;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.settle = this.options.settleSec;
  }

  sample(frameDt: number, active: boolean): void {
    this.windowTime += frameDt;
    this.windowFrames += 1;
    if (this.windowTime < 0.5) return;
    this.fps = this.windowFrames / this.windowTime;
    const elapsed = this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    if (!active) return;
    if (this.settle > 0) {
      this.settle -= elapsed;
      return;
    }
    this.lowFor = this.fps < this.options.targetFps ? this.lowFor + elapsed : 0;
    if (this.lowFor >= this.options.sustainSec && this.levelIndex < qualityLevels.length - 1) {
      this.levelIndex += 1;
      this.lowFor = 0;
      this.settle = this.options.settleSec;
      this.apply(this.current, this.levelIndex);
    }
  }
}
