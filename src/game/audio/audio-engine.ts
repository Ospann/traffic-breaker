export const AUDIO_DIR = 'assets/audio/';

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private readonly listeners = new Set<() => void>();

  get ctx(): AudioContext | null {
    return this.context;
  }

  get output(): AudioNode | null {
    return this.master;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  installUnlock(target: EventTarget = window): void {
    const events = ['pointerdown', 'touchend', 'click', 'keydown'];
    const unlock = (): void => {
      this.unlock();
      if (this.context?.state === 'running') {
        for (const name of events) target.removeEventListener(name, unlock);
      }
    };
    for (const name of events) target.addEventListener(name, unlock);
  }

  unlock(): void {
    if (!this.context) {
      const Ctor = window.AudioContext;
      if (typeof Ctor !== 'function') return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.context.destination);
      this.context.addEventListener('statechange', () => this.emit());
      this.emit();
    }
    if (this.context.state === 'suspended' && !this.muted) {
      this.context.resume().catch((error: unknown) => console.warn('[audio] resume failed', error));
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const context = this.context;
    const master = this.master;
    if (context && master) {
      master.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.02);
      if (muted) {
        context.suspend().catch((error: unknown) => console.warn('[audio] suspend failed', error));
      } else {
        context.resume().catch((error: unknown) => console.warn('[audio] resume failed', error));
      }
    }
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
