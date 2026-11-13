import type { PlatformStorage } from '../platform/types';

export type SaveData = Record<string, unknown>;

export type Migration = (data: SaveData) => SaveData;

export interface SaveSchema<T extends SaveData> {
  version: number;
  defaults: () => T;
  migrations?: Readonly<Record<number, Migration>>;
}

export interface SaveManagerOptions<T extends SaveData> {
  key: string;
  schema: SaveSchema<T>;
  storage: PlatformStorage;
  fallback?: PlatformStorage | null;
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

interface Envelope {
  v: number;
  data: SaveData;
}

function isRecord(value: unknown): value is SaveData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEnvelope(raw: string | null): Envelope | null {
  if (raw === null || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.v !== 'number' || !isRecord(parsed.data)) return null;
  return { v: parsed.v, data: parsed.data };
}

export function migrate<T extends SaveData>(envelope: Envelope | null, schema: SaveSchema<T>): T {
  const defaults = schema.defaults();
  if (!envelope) return defaults;
  if (envelope.v > schema.version) {
    throw new Error(
      `Save version ${envelope.v} is newer than the supported version ${schema.version}`,
    );
  }

  let data = envelope.data;
  for (let version = envelope.v + 1; version <= schema.version; version += 1) {
    const step = schema.migrations?.[version];
    if (!step) throw new Error(`Missing save migration to version ${version}`);
    data = step(structuredClone(data));
  }

  return { ...defaults, ...data };
}

export class SaveManager<T extends SaveData> {
  private state: T;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> = Promise.resolve();
  private writable = true;
  private readonly key: string;
  private readonly schema: SaveSchema<T>;
  private readonly storage: PlatformStorage;
  private readonly fallback: PlatformStorage | null;
  private readonly debounceMs: number;
  private readonly onError: (error: unknown) => void;

  constructor(options: SaveManagerOptions<T>) {
    this.key = options.key;
    this.schema = options.schema;
    this.storage = options.storage;
    this.fallback = options.fallback ?? null;
    this.debounceMs = options.debounceMs ?? 500;
    this.onError = options.onError ?? ((error) => console.warn('[save]', error));
    this.state = options.schema.defaults();
  }

  get data(): Readonly<T> {
    return this.state;
  }

  get isWritable(): boolean {
    return this.writable;
  }

  async load(): Promise<Readonly<T>> {
    const envelope = parseEnvelope(await this.readRaw());
    this.writable = true;
    try {
      this.state = migrate(envelope, this.schema);
    } catch (error) {
      this.onError(error);
      this.state = this.schema.defaults();
      this.writable = !(envelope && envelope.v > this.schema.version);
      return this.state;
    }
    if (envelope && envelope.v !== this.schema.version) this.schedule();
    return this.state;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.state = { ...this.state, [key]: value };
    this.schedule();
  }

  update(mutator: (draft: T) => void): void {
    const draft = structuredClone(this.state);
    mutator(draft);
    this.state = draft;
    this.schedule();
  }

  async reset(): Promise<void> {
    this.state = this.schema.defaults();
    await this.flush();
  }

  flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.writable) return this.pending;
    const payload = JSON.stringify({ v: this.schema.version, data: this.state } satisfies Envelope);
    this.pending = this.pending.then(() => this.writeRaw(payload));
    return this.pending;
  }

  private schedule(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }

  private async readRaw(): Promise<string | null> {
    try {
      const value = await this.storage.get(this.key);
      if (value !== null) return value;
    } catch (error) {
      this.onError(error);
    }
    if (!this.fallback) return null;
    try {
      return await this.fallback.get(this.key);
    } catch (error) {
      this.onError(error);
      return null;
    }
  }

  private async writeRaw(payload: string): Promise<void> {
    try {
      await this.storage.set(this.key, payload);
      return;
    } catch (error) {
      this.onError(error);
    }
    if (!this.fallback) return;
    try {
      await this.fallback.set(this.key, payload);
    } catch (error) {
      this.onError(error);
    }
  }
}
