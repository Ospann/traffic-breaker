import { describe, expect, it } from 'vitest';
import { speedAt, speedCurve } from '../src/game/balance';
import { patterns } from '../src/game/patterns';
import { coinPoints } from '../src/game/patterns/coins';
import { parsePattern, type Pattern } from '../src/game/patterns/pattern-schema';
import { PassValidator } from '../src/game/patterns/validator';
import { BREATHER_TAG } from '../src/game/world/pattern-generator';
import { obstacleSpecs, surfaceHeight } from '../src/game/world/entities';

const SPEEDS = [speedCurve.startSpeed, speedAt(speedCurve.rampSec / 3), speedCurve.maxSpeed];
const EXIT_MARGIN = 2;

function make(id: string, obstacles: unknown[], length = 80): Pattern {
  return parsePattern({ id, length, difficulty: 1, tags: [], obstacles, coins: [] }, id);
}

const validator = new PassValidator();

describe('pattern library', () => {
  it('has at least 40 patterns over three difficulties, with breathers', () => {
    expect(patterns.length).toBeGreaterThanOrEqual(40);
    for (const difficulty of [1, 2, 3]) {
      expect(patterns.filter((p) => p.difficulty === difficulty).length).toBeGreaterThanOrEqual(8);
    }
    expect(patterns.filter((p) => p.tags.includes(BREATHER_TAG)).length).toBeGreaterThanOrEqual(2);
    expect(new Set(patterns.map((p) => p.id)).size).toBe(patterns.length);
  });

  it.each(patterns.map((p) => [p.id, p] as const))(
    '%s keeps obstacles inside its length',
    (_, p) => {
      for (const o of p.obstacles) {
        expect(o.z + obstacleSpecs[o.type].length).toBeLessThanOrEqual(p.length - EXIT_MARGIN);
      }
    },
  );

  it.each(patterns.map((p) => [p.id, p] as const))('%s has no coins inside solids', (_, p) => {
    for (const group of p.coins) {
      for (const coin of coinPoints(group)) {
        expect(coin.z).toBeLessThanOrEqual(p.length);
        for (const o of p.obstacles) {
          const spec = obstacleSpecs[o.type];
          if (!spec.solid || o.lane !== coin.lane) continue;
          if (coin.z < o.z || coin.z > o.z + spec.length) continue;
          const top = spec.roof ? surfaceHeight(spec, coin.z - o.z) : spec.y1;
          const inside = coin.y >= spec.y0 && coin.y <= top;
          expect(inside, `${o.type} at z=${o.z} swallows coin z=${coin.z} y=${coin.y}`).toBe(false);
        }
      }
    }
  });
});

describe('PassValidator', () => {
  it('rejects impossible patterns', () => {
    const wall = make(
      'wall',
      [0, 1, 2].map((lane) => ({ type: 'truck', lane, z: 30 })),
    );
    const tight = make('tight', [
      { type: 'truck', lane: 0, z: 3 },
      { type: 'truck', lane: 1, z: 3 },
    ]);
    const jumpThenDuck = make(
      'jump-then-duck',
      [0, 1, 2].flatMap((lane) => [
        { type: 'lowBarrier', lane, z: 30 },
        { type: 'highSign', lane, z: 32 },
      ]),
    );
    const shortGap = make('short-gap', [
      { type: 'truck', lane: 0, z: 15 },
      { type: 'truck', lane: 2, z: 15 },
      { type: 'truck', lane: 1, z: 29 },
      { type: 'truck', lane: 0, z: 43 },
      { type: 'truck', lane: 2, z: 43 },
    ]);
    for (const speed of SPEEDS) {
      expect(validator.validatePattern(wall, speed).ok).toBe(false);
      expect(validator.validatePattern(jumpThenDuck, speed).ok).toBe(false);
      expect(validator.validatePattern(shortGap, speed).ok).toBe(false);
      expect(validator.validatePattern(tight, speed).failedLanes).toEqual([0, 1]);
    }
  });

  it('accepts jumps, ducks and ramp-to-roof runs', () => {
    const lows = make(
      'lows',
      [0, 1, 2].map((lane) => ({ type: 'lowBarrier', lane, z: 30 })),
    );
    const signs = make(
      'signs',
      [0, 1, 2].map((lane) => ({ type: 'highSign', lane, z: 30 })),
    );
    const roofOnly = make('roof-only', [
      { type: 'ramp', lane: 1, z: 20 },
      { type: 'truck', lane: 1, z: 27 },
      { type: 'truck', lane: 1, z: 40 },
      { type: 'truck', lane: 0, z: 27 },
      { type: 'truck', lane: 2, z: 27 },
      { type: 'truck', lane: 0, z: 40 },
      { type: 'truck', lane: 2, z: 40 },
    ]);
    for (const speed of SPEEDS) {
      expect(validator.validatePattern(lows, speed).ok).toBe(true);
      expect(validator.validatePattern(signs, speed).ok).toBe(true);
      expect(validator.validatePattern(roofOnly, speed).ok).toBe(true);
    }
  });

  describe.each(SPEEDS.map((s) => [s.toFixed(1), s] as const))('at %s m/s', (_label, speed) => {
    it.each(patterns.map((p) => [p.id, p] as const))('%s is passable from every lane', (_, p) => {
      expect(validator.validatePattern(p, speed).failedLanes).toEqual([]);
    });

    it('every junction of two patterns is passable', () => {
      const failures: string[] = [];
      for (const a of patterns) {
        for (const b of patterns) {
          const report = validator.validateJunction(a, b, speed);
          if (!report.ok)
            failures.push(`${a.id} -> ${b.id} (lanes ${report.failedLanes.join(',')})`);
        }
      }
      expect(failures).toEqual([]);
    });
  });
});
