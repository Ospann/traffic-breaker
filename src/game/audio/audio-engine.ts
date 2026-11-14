export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  get ctx(): AudioContext | null {
    return this.context;
  }

  get output(): AudioNode | null {
    return this.master;
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
    }
    if (this.context.state === 'suspended' && !this.muted) {
      this.context.resume().catch((error: unknown) => console.warn('[audio] resume failed', error));
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    master.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.02);
    if (muted) {
      context.suspend().catch((error: unknown) => console.warn('[audio] suspend failed', error));
    } else {
      context.resume().catch((error: unknown) => console.warn('[audio] resume failed', error));
    }
  }
}
