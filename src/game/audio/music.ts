import { AUDIO_DIR, type AudioEngine } from './audio-engine';

export type MusicTrack = 'menu' | 'run';

const TRACKS: Readonly<Record<MusicTrack, string>> = {
  menu: 'music-menu.mp3',
  run: 'music-run.mp3',
};

const MUSIC_VOLUME = 0.32;

export class Music {
  private readonly elements = new Map<MusicTrack, HTMLAudioElement>();
  private track: MusicTrack | null = null;

  constructor(private readonly engine: AudioEngine) {
    engine.onChange(() => this.sync());
  }

  play(track: MusicTrack | null): void {
    if (track === this.track) return;
    this.track = track;
    const element = track ? this.elements.get(track) : undefined;
    if (element) element.currentTime = 0;
    this.sync();
  }

  private sync(): void {
    const audible = this.engine.ctx !== null && !this.engine.isMuted;
    for (const [id, element] of this.elements) {
      if ((id !== this.track || !audible) && !element.paused) element.pause();
    }
    if (!audible || !this.track) return;
    const element = this.element(this.track);
    if (!element || !element.paused) return;
    element.play().catch((error: unknown) => console.warn('[music] play failed', error));
  }

  private element(track: MusicTrack): HTMLAudioElement | null {
    const existing = this.elements.get(track);
    if (existing) return existing;
    const ctx = this.engine.ctx;
    const out = this.engine.output;
    if (!ctx || !out || typeof Audio !== 'function') return null;
    const element = new Audio(AUDIO_DIR + TRACKS[track]);
    element.loop = true;
    element.preload = 'auto';
    element.addEventListener('error', () => console.warn(`[music] failed to load ${track}`), {
      once: true,
    });
    try {
      const gain = ctx.createGain();
      gain.gain.value = MUSIC_VOLUME;
      ctx.createMediaElementSource(element).connect(gain).connect(out);
    } catch (error) {
      console.warn('[music] routing failed', error);
      element.volume = MUSIC_VOLUME;
    }
    this.elements.set(track, element);
    return element;
  }
}
