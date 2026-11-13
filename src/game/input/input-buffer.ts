import type { Action } from './actions';

interface Entry {
  action: Action;
  at: number;
}

export class InputBuffer {
  private entries: Entry[] = [];

  constructor(private readonly windowSec = 0.15) {}

  push(action: Action, now: number): void {
    this.entries.push({ action, at: now });
  }

  drain(now: number, tryPerform: (action: Action) => boolean): void {
    if (this.entries.length === 0) return;
    const kept: Entry[] = [];
    for (const entry of this.entries) {
      if (now - entry.at > this.windowSec) continue;
      if (!tryPerform(entry.action)) kept.push(entry);
    }
    this.entries = kept;
  }

  get size(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}
