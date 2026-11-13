import { describe, expect, it } from 'vitest';
import { speedAt, speedCurve } from '../src/game/balance';

describe('speed curve', () => {
  it('grows monotonically from start to the cap and stays there', () => {
    let previous = speedAt(0);
    expect(previous).toBe(speedCurve.startSpeed);
    for (let t = 1; t <= speedCurve.rampSec + 60; t += 1) {
      const speed = speedAt(t);
      expect(speed).toBeGreaterThanOrEqual(previous);
      previous = speed;
    }
    expect(speedAt(speedCurve.rampSec)).toBe(speedCurve.maxSpeed);
    expect(speedAt(10_000)).toBe(speedCurve.maxSpeed);
  });
});
