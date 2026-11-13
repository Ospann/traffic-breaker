import { describe, expect, it } from 'vitest';
import { patterns } from '../src/game/patterns';
import { BREATHER_TAG, PatternGenerator } from '../src/game/world/pattern-generator';

function sample(seed: number, fromSec: number, toSec: number, count: number) {
  const generator = new PatternGenerator(patterns, () => seed);
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    picks.push(generator.next(fromSec + ((toSec - fromSec) * i) / count));
  }
  return picks;
}

function averageDifficulty(from: number, to: number): number {
  const picks = sample(7, from, to, 2000).filter((p) => !p.tags.includes(BREATHER_TAG));
  return picks.reduce((sum, p) => sum + p.difficulty, 0) / picks.length;
}

describe('PatternGenerator', () => {
  it('never repeats a pattern back to back', () => {
    for (const seed of [1, 2, 3, 42]) {
      const picks = sample(seed, 0, 600, 3000);
      for (let i = 1; i < picks.length; i += 1) {
        expect(picks[i]?.id).not.toBe(picks[i - 1]?.id);
      }
    }
  });

  it('difficulty grows over time', () => {
    const early = averageDifficulty(0, 30);
    const middle = averageDifficulty(90, 120);
    const late = averageDifficulty(240, 300);
    expect(early).toBeLessThan(1.3);
    expect(middle).toBeGreaterThan(early);
    expect(late).toBeGreaterThan(middle + 0.2);
  });

  it('starts with easy patterns only', () => {
    const picks = sample(11, 0, 10, 30);
    expect(picks.every((p) => p.difficulty <= 2)).toBe(true);
    expect(picks.filter((p) => p.difficulty === 1).length).toBeGreaterThan(20);
  });

  it('puts a breather right after every hard pattern', () => {
    const picks = sample(5, 200, 600, 2000);
    let hard = 0;
    for (let i = 0; i < picks.length - 1; i += 1) {
      if (picks[i]?.difficulty !== 3) continue;
      hard += 1;
      expect(picks[i + 1]?.tags).toContain(BREATHER_TAG);
    }
    expect(hard).toBeGreaterThan(100);
  });

  it('is deterministic for a seed and resets', () => {
    const generator = new PatternGenerator(patterns, () => 99);
    const first = Array.from({ length: 20 }, (_, i) => generator.next(i * 10).id);
    generator.reset();
    const second = Array.from({ length: 20 }, (_, i) => generator.next(i * 10).id);
    expect(second).toEqual(first);
  });
});
