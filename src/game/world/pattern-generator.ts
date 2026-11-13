import { difficultyWeights, generator } from '../balance';
import type { Difficulty, Pattern } from '../patterns/pattern-schema';
import { mulberry32, randomSeed, type Random } from './random';
import type { PatternSource } from './track';

export const BREATHER_TAG = 'breather';

const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

export class PatternGenerator implements PatternSource {
  private readonly byDifficulty: Readonly<Record<Difficulty, readonly Pattern[]>>;
  private readonly breathers: readonly Pattern[];
  private recent: string[] = [];
  private needBreather = false;
  private random: Random;

  constructor(
    patterns: readonly Pattern[],
    private readonly seed: () => number = randomSeed,
  ) {
    const regular = patterns.filter((p) => !p.tags.includes(BREATHER_TAG));
    this.byDifficulty = {
      1: regular.filter((p) => p.difficulty === 1),
      2: regular.filter((p) => p.difficulty === 2),
      3: regular.filter((p) => p.difficulty === 3),
    };
    this.breathers = patterns.filter((p) => p.tags.includes(BREATHER_TAG));
    if (this.byDifficulty[1].length === 0)
      throw new Error('PatternGenerator needs difficulty 1 patterns');
    this.random = mulberry32(this.seed());
  }

  reset(): void {
    this.recent = [];
    this.needBreather = false;
    this.random = mulberry32(this.seed());
  }

  next(elapsedSec: number): Pattern {
    if (this.needBreather && this.breathers.length > 0) {
      this.needBreather = false;
      return this.remember(this.pick(this.breathers));
    }
    const difficulty = this.pickDifficulty(elapsedSec);
    const pattern = this.remember(this.pick(this.byDifficulty[difficulty]));
    this.needBreather = pattern.difficulty >= generator.breatherAfterDifficulty;
    return pattern;
  }

  private pickDifficulty(elapsedSec: number): Difficulty {
    const weights = difficultyWeights(elapsedSec);
    const available = DIFFICULTIES.map((difficulty, i) =>
      this.byDifficulty[difficulty].length > 0 ? (weights[i] ?? 0) : 0,
    );
    const total = available.reduce((sum, w) => sum + w, 0);
    let roll = this.random() * total;
    for (let i = 0; i < DIFFICULTIES.length; i += 1) {
      roll -= available[i] ?? 0;
      if (roll <= 0) return DIFFICULTIES[i] ?? 1;
    }
    return 1;
  }

  private pick(pool: readonly Pattern[]): Pattern {
    const last = this.recent.at(-1);
    const fresh = pool.filter((p) => !this.recent.includes(p.id));
    const allowed = fresh.length > 0 ? fresh : pool.filter((p) => p.id !== last);
    const options = allowed.length > 0 ? allowed : pool;
    const pattern = options[Math.floor(this.random() * options.length)];
    if (!pattern) throw new Error('Empty pattern pool');
    return pattern;
  }

  private remember(pattern: Pattern): Pattern {
    this.recent.push(pattern.id);
    if (this.recent.length > generator.recentMemory) this.recent.shift();
    return pattern;
  }
}
