import type { Pattern } from '../patterns/pattern-schema';
import type { PatternSource } from './track';

export class PrefixedSource implements PatternSource {
  private prefix: Pattern[] = [];

  constructor(private readonly inner: PatternSource) {}

  setPrefix(patterns: readonly Pattern[]): void {
    this.prefix = [...patterns];
  }

  next(elapsedSec: number): Pattern {
    return this.prefix.shift() ?? this.inner.next(elapsedSec);
  }

  reset(): void {
    this.inner.reset();
  }
}
