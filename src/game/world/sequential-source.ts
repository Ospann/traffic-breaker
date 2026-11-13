import type { Pattern } from '../patterns/pattern-schema';
import type { PatternSource } from './track';

export class SequentialSource implements PatternSource {
  private index = -1;

  constructor(private readonly patterns: readonly Pattern[]) {
    if (patterns.length === 0) throw new Error('SequentialSource needs at least one pattern');
  }

  next(): Pattern {
    this.index = (this.index + 1) % this.patterns.length;
    const pattern = this.patterns[this.index];
    if (!pattern) throw new Error('Pattern index out of range');
    return pattern;
  }

  reset(): void {
    this.index = -1;
  }
}
