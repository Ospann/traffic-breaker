import { AUDIO_DIR, type AudioEngine } from './audio-engine';

export class AudioBank<K extends string> {
  private readonly pending = new Map<K, Promise<ArrayBuffer | null>>();
  private readonly buffers = new Map<K, AudioBuffer>();
  private decodedFor: AudioContext | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly files: Readonly<Record<K, string>>,
  ) {
    engine.onChange(() => this.decode());
  }

  preload(): void {
    if (this.pending.size > 0 || typeof fetch !== 'function') return;
    for (const name in this.files) this.pending.set(name, this.fetchFile(this.files[name]));
    this.decode();
  }

  get(name: K): AudioBuffer | null {
    return this.buffers.get(name) ?? null;
  }

  private fetchFile(file: string): Promise<ArrayBuffer | null> {
    return fetch(AUDIO_DIR + file)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .catch((error: unknown) => {
        console.warn(`[audio] failed to load ${file}`, error);
        return null;
      });
  }

  private decode(): void {
    const ctx = this.engine.ctx;
    if (!ctx || this.pending.size === 0 || this.decodedFor === ctx) return;
    this.decodedFor = ctx;
    for (const [name, request] of this.pending) {
      request
        .then((data) => (data ? ctx.decodeAudioData(data) : null))
        .then((buffer) => {
          if (buffer) this.buffers.set(name, buffer);
        })
        .catch((error: unknown) => console.warn(`[audio] failed to decode ${name}`, error));
    }
  }
}
