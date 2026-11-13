import { describe, expect, it } from 'vitest';
import type { Action } from '../src/game/input/actions';
import { InputBuffer } from '../src/game/input/input-buffer';

describe('InputBuffer', () => {
  it('performs an action as soon as it becomes possible within 150 ms', () => {
    const buffer = new InputBuffer(0.15);
    const done: Action[] = [];
    buffer.push('up', 1);
    buffer.drain(1.05, () => false);
    buffer.drain(1.12, (action) => {
      done.push(action);
      return true;
    });
    expect(done).toEqual(['up']);
    expect(buffer.size).toBe(0);
  });

  it('drops actions older than the window', () => {
    const buffer = new InputBuffer(0.15);
    const done: Action[] = [];
    buffer.push('up', 1);
    buffer.drain(1.1, () => false);
    buffer.drain(1.2, (action) => {
      done.push(action);
      return true;
    });
    expect(done).toEqual([]);
    expect(buffer.size).toBe(0);
  });

  it('keeps blocked actions while later ones run', () => {
    const buffer = new InputBuffer(0.15);
    buffer.push('up', 0);
    buffer.push('left', 0.01);
    const done: Action[] = [];
    buffer.drain(0.02, (action) => {
      if (action === 'up') return false;
      done.push(action);
      return true;
    });
    expect(done).toEqual(['left']);
    expect(buffer.size).toBe(1);
  });
});
