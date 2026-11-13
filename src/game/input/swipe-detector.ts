import type { Action } from './actions';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeDetectorOptions {
  minDistance: number;
  minVelocity: number;
  velocityWindowMs: number;
  tapMaxDistance: number;
  tapMaxDurationMs: number;
  doubleTapGapMs: number;
  doubleTapMaxDistance: number;
}

export const defaultSwipeOptions: SwipeDetectorOptions = {
  minDistance: 36,
  minVelocity: 0.35,
  velocityWindowMs: 90,
  tapMaxDistance: 18,
  tapMaxDurationMs: 260,
  doubleTapGapMs: 300,
  doubleTapMaxDistance: 90,
};

interface Sample {
  x: number;
  y: number;
  t: number;
}

interface Track {
  startX: number;
  startY: number;
  startT: number;
  anchor: Sample;
  samples: Sample[];
  maxTravel: number;
  fired: SwipeDirection[];
}

interface Tap {
  x: number;
  y: number;
  t: number;
}

export type Gesture = SwipeDirection | 'doubleTap';

export function gestureToAction(gesture: Gesture): Action {
  return gesture === 'doubleTap' ? 'dash' : gesture;
}

export class SwipeDetector {
  private readonly tracks = new Map<number, Track>();
  private lastTap: Tap | null = null;
  private readonly options: SwipeDetectorOptions;

  constructor(options: Partial<SwipeDetectorOptions> = {}) {
    this.options = { ...defaultSwipeOptions, ...options };
  }

  down(id: number, x: number, y: number, t: number): void {
    const sample = { x, y, t };
    this.tracks.set(id, {
      startX: x,
      startY: y,
      startT: t,
      anchor: sample,
      samples: [sample],
      maxTravel: 0,
      fired: [],
    });
  }

  move(id: number, x: number, y: number, t: number): SwipeDirection | null {
    const track = this.tracks.get(id);
    if (!track) return null;
    const sample = { x, y, t };
    track.samples.push(sample);
    const windowStart = t - this.options.velocityWindowMs;
    while (track.samples.length > 2 && (track.samples[1]?.t ?? t) <= windowStart) {
      track.samples.shift();
    }
    track.maxTravel = Math.max(track.maxTravel, Math.hypot(x - track.startX, y - track.startY));

    const dx = x - track.anchor.x;
    const dy = y - track.anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance < this.options.minDistance) return null;

    const oldest = track.samples[0] ?? sample;
    const elapsed = Math.max(t - oldest.t, 1);
    const velocity = Math.hypot(x - oldest.x, y - oldest.y) / elapsed;
    if (velocity < this.options.minVelocity) {
      track.anchor = oldest;
      return null;
    }

    const direction: SwipeDirection =
      Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    if (track.fired.at(-1) === direction) return null;
    track.fired.push(direction);
    track.anchor = sample;
    track.samples = [sample];
    return direction;
  }

  up(id: number, x: number, y: number, t: number): 'doubleTap' | null {
    const track = this.tracks.get(id);
    this.tracks.delete(id);
    if (!track) return null;
    const travel = Math.max(track.maxTravel, Math.hypot(x - track.startX, y - track.startY));
    const isTap =
      track.fired.length === 0 &&
      travel <= this.options.tapMaxDistance &&
      t - track.startT <= this.options.tapMaxDurationMs;
    if (!isTap) {
      this.lastTap = null;
      return null;
    }
    const previous = this.lastTap;
    if (
      previous &&
      track.startT - previous.t <= this.options.doubleTapGapMs &&
      Math.hypot(x - previous.x, y - previous.y) <= this.options.doubleTapMaxDistance
    ) {
      this.lastTap = null;
      return 'doubleTap';
    }
    this.lastTap = { x, y, t };
    return null;
  }

  cancel(id: number): void {
    this.tracks.delete(id);
  }

  reset(): void {
    this.tracks.clear();
    this.lastTap = null;
  }
}
