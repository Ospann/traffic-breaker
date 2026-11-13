import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformStorage } from '@core/platform';
import { SaveManager, migrate, type SaveSchema } from '@core/save';

class MemoryStore implements PlatformStorage {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;
  writes = 0;

  async get(key: string): Promise<string | null> {
    if (this.failReads) throw new Error('read failed');
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    if (this.failWrites) throw new Error('write failed');
    this.writes += 1;
    this.values.set(key, value);
  }
}

interface SaveV3 extends Record<string, unknown> {
  coins: number;
  bestScore: number;
  settings: { sound: boolean };
}

const schema: SaveSchema<SaveV3> = {
  version: 3,
  defaults: () => ({ coins: 0, bestScore: 0, settings: { sound: true } }),
  migrations: {
    2: (data) => {
      const { highScore, ...rest } = data;
      return { ...rest, bestScore: highScore };
    },
    3: (data) => ({ ...data, settings: { sound: data.muted !== true } }),
  },
};

const envelope = (v: number, data: Record<string, unknown>): string => JSON.stringify({ v, data });

const silent = (): void => {};

describe('migrate', () => {
  it('returns defaults when there is no save', () => {
    expect(migrate(null, schema)).toEqual(schema.defaults());
  });

  it('runs every migration step in order from the stored version', () => {
    const result = migrate({ v: 1, data: { coins: 5, highScore: 42, muted: true } }, schema);
    expect(result).toMatchObject({ coins: 5, bestScore: 42, settings: { sound: false } });
    expect(result).not.toHaveProperty('highScore');
  });

  it('runs only the remaining steps for an intermediate version', () => {
    const result = migrate({ v: 2, data: { coins: 1, bestScore: 7 } }, schema);
    expect(result).toEqual({ coins: 1, bestScore: 7, settings: { sound: true } });
  });

  it('fills fields that are missing from older saves with defaults', () => {
    const result = migrate({ v: 3, data: { coins: 9 } }, schema);
    expect(result).toEqual({ coins: 9, bestScore: 0, settings: { sound: true } });
  });

  it('throws when a migration step is missing', () => {
    const broken: SaveSchema<SaveV3> = { ...schema, migrations: { 3: (d) => d } };
    expect(() => migrate({ v: 1, data: {} }, broken)).toThrow(/version 2/);
  });

  it('throws for a save written by a newer build', () => {
    expect(() => migrate({ v: 4, data: {} }, schema)).toThrow(/newer/);
  });
});

describe('SaveManager', () => {
  let storage: MemoryStore;
  let fallback: MemoryStore;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = new MemoryStore();
    fallback = new MemoryStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const create = (): SaveManager<SaveV3> =>
    new SaveManager({ key: 'save', schema, storage, fallback, debounceMs: 200, onError: silent });

  it('loads and migrates an old save, then writes it back at the current version', async () => {
    storage.values.set('save', envelope(1, { coins: 3, highScore: 10 }));
    const save = create();
    const data = await save.load();
    expect(data.bestScore).toBe(10);

    await vi.advanceTimersByTimeAsync(200);
    expect(JSON.parse(storage.values.get('save') ?? '')).toEqual({
      v: 3,
      data: { coins: 3, bestScore: 10, settings: { sound: true } },
    });
  });

  it('falls back to defaults on corrupted JSON', async () => {
    storage.values.set('save', '{not json');
    const save = create();
    expect(await save.load()).toEqual(schema.defaults());
  });

  it('debounces writes', async () => {
    const save = create();
    await save.load();
    save.set('coins', 1);
    save.set('coins', 2);
    save.update((d) => {
      d.coins += 1;
    });
    await vi.advanceTimersByTimeAsync(199);
    expect(storage.writes).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(storage.writes).toBe(1);
    expect(JSON.parse(storage.values.get('save') ?? '').data.coins).toBe(3);
  });

  it('flush writes immediately and cancels the pending debounce', async () => {
    const save = create();
    await save.load();
    save.set('coins', 5);
    await save.flush();
    expect(storage.writes).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(storage.writes).toBe(1);
  });

  it('writes to the fallback when platform storage fails', async () => {
    storage.failWrites = true;
    const save = create();
    await save.load();
    save.set('coins', 7);
    await save.flush();
    expect(JSON.parse(fallback.values.get('save') ?? '').data.coins).toBe(7);
  });

  it('reads from the fallback when platform storage fails or is empty', async () => {
    fallback.values.set(
      'save',
      envelope(3, { coins: 11, bestScore: 1, settings: { sound: true } }),
    );
    storage.failReads = true;
    const save = create();
    expect((await save.load()).coins).toBe(11);
  });

  it('does not overwrite a save written by a newer build', async () => {
    const newer = envelope(9, { coins: 999 });
    storage.values.set('save', newer);
    const save = create();
    await save.load();
    save.set('coins', 1);
    await save.flush();
    expect(save.isWritable).toBe(false);
    expect(storage.values.get('save')).toBe(newer);
  });
});
