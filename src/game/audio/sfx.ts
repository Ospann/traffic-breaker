import type { BonusType } from '../balance';
import type { AudioEngine } from './audio-engine';

export type SfxName =
  | 'swipe'
  | 'jump'
  | 'superJump'
  | 'land'
  | 'duck'
  | 'dash'
  | 'rampLaunch'
  | 'lightHit'
  | 'crash'
  | 'deco'
  | 'shieldOn'
  | 'shieldSave'
  | 'shieldEnd'
  | 'bonusEnd'
  | 'mission'
  | 'click'
  | 'revive';

export interface MotorState {
  speed: number;
  running: boolean;
  dashing: boolean;
  droneNear: boolean;
}

interface Loops {
  hum: OscillatorNode;
  whine: OscillatorNode;
  filter: BiquadFilterNode;
  motorGain: GainNode;
  jetGain: GainNode;
  siren: OscillatorNode;
  sirenGain: GainNode;
}

const BONUS_NOTES: Readonly<Record<BonusType, readonly number[]>> = {
  fullTank: [392, 523, 659, 784, 1046],
  magnet: [523, 659, 784, 1046],
  double: [587, 740, 880, 1175],
  superJump: [440, 554, 659, 880],
};

export class Sfx {
  private noise: AudioBuffer | null = null;
  private loops: Loops | null = null;
  private time = 0;

  constructor(private readonly engine: AudioEngine) {}

  update(dt: number, state: MotorState): void {
    this.time += dt;
    const loops = this.ensureLoops();
    const ctx = this.engine.ctx;
    if (!loops || !ctx) return;
    const now = ctx.currentTime;
    const speed = state.running ? state.speed : 6;
    loops.hum.frequency.setTargetAtTime(38 + speed * 2.2, now, 0.1);
    loops.whine.frequency.setTargetAtTime(180 + speed * 22 + (state.dashing ? 260 : 0), now, 0.12);
    loops.filter.frequency.setTargetAtTime(300 + speed * 35, now, 0.1);
    loops.motorGain.gain.setTargetAtTime(state.running ? 0.05 : 0.02, now, 0.2);
    loops.jetGain.gain.setTargetAtTime(state.running && state.dashing ? 0.16 : 0, now, 0.08);
    const high = Math.floor(this.time * 2.8) % 2 === 0;
    loops.siren.frequency.setTargetAtTime(high ? 960 : 700, now, 0.02);
    loops.sirenGain.gain.setTargetAtTime(state.running && state.droneNear ? 0.035 : 0, now, 0.1);
  }

  silenceLoops(): void {
    const ctx = this.engine.ctx;
    const loops = this.loops;
    if (!ctx || !loops) return;
    const now = ctx.currentTime;
    loops.motorGain.gain.setTargetAtTime(0, now, 0.05);
    loops.jetGain.gain.setTargetAtTime(0, now, 0.05);
    loops.sirenGain.gain.setTargetAtTime(0, now, 0.05);
  }

  coin(streak: number): void {
    const semis = Math.min(Math.max(streak - 1, 0), 18);
    const base = 988 * 2 ** (semis / 12);
    this.tone(base, 0.07, 'triangle', 0.09);
    this.tone(base * 1.5, 0.09, 'sine', 0.06, undefined, 0.035);
  }

  bonus(type: BonusType): void {
    BONUS_NOTES[type].forEach((note, i) =>
      this.tone(note, 0.1, 'square', 0.05, undefined, i * 0.06),
    );
  }

  play(name: SfxName): void {
    switch (name) {
      case 'swipe':
        this.hiss(0.12, 0.07, 'bandpass', 900, 2600, 1.2);
        return;
      case 'jump':
        this.hiss(0.28, 0.16, 'highpass', 2600, 1200, 0.7);
        this.tone(260, 0.18, 'sine', 0.05, 520);
        return;
      case 'superJump':
        this.hiss(0.4, 0.2, 'highpass', 3000, 900, 0.7);
        this.tone(220, 0.3, 'sine', 0.07, 660);
        return;
      case 'land':
        this.tone(130, 0.12, 'sine', 0.12, 50);
        this.hiss(0.07, 0.06, 'lowpass', 900, 300, 0.7);
        return;
      case 'duck':
        this.hiss(0.1, 0.05, 'bandpass', 600, 300, 1);
        return;
      case 'dash':
        this.hiss(0.9, 0.24, 'bandpass', 2400, 700, 0.6);
        this.tone(70, 0.6, 'sine', 0.12, 40);
        return;
      case 'rampLaunch':
        this.hiss(0.35, 0.14, 'highpass', 2200, 1000, 0.7);
        this.tone(300, 0.25, 'triangle', 0.05, 700);
        return;
      case 'lightHit':
        this.tone(160, 0.14, 'sine', 0.16, 60);
        this.hiss(0.15, 0.12, 'bandpass', 1400, 500, 1.5);
        this.tone(1900, 0.08, 'square', 0.03);
        return;
      case 'crash':
        this.tone(110, 0.5, 'sawtooth', 0.12, 35);
        this.hiss(0.7, 0.25, 'lowpass', 3000, 200, 0.8);
        this.hiss(0.25, 0.08, 'highpass', 5000, 3000, 0.7, 0.05);
        return;
      case 'deco':
        this.tone(1400, 0.05, 'square', 0.025, 700);
        return;
      case 'shieldOn':
        this.tone(400, 0.4, 'sine', 0.07, 1300);
        this.tone(800, 0.4, 'triangle', 0.03, 2000, 0.05);
        return;
      case 'shieldSave':
        this.tone(1300, 0.3, 'sawtooth', 0.06, 180);
        this.hiss(0.2, 0.1, 'bandpass', 2000, 800, 1);
        return;
      case 'shieldEnd':
      case 'bonusEnd':
        this.tone(660, 0.08, 'triangle', 0.04);
        this.tone(440, 0.1, 'triangle', 0.04, undefined, 0.08);
        return;
      case 'mission':
        this.tone(784, 0.12, 'triangle', 0.07);
        this.tone(1175, 0.2, 'triangle', 0.07, undefined, 0.1);
        return;
      case 'click':
        this.tone(1200, 0.03, 'square', 0.03);
        return;
      case 'revive':
        [523, 659, 784].forEach((note, i) =>
          this.tone(note, 0.12, 'triangle', 0.06, undefined, i * 0.08),
        );
        this.hiss(0.6, 0.12, 'highpass', 1500, 3000, 0.7);
        return;
    }
  }

  private context(): { ctx: AudioContext; out: AudioNode } | null {
    const ctx = this.engine.ctx;
    const out = this.engine.output;
    if (!ctx || !out || ctx.state !== 'running') return null;
    return { ctx, out };
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    freqEnd?: number,
    delay = 0,
  ): void {
    const c = this.context();
    if (!c) return;
    const { ctx, out } = c;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private hiss(
    duration: number,
    volume: number,
    filterType: BiquadFilterType,
    from: number,
    to: number,
    q: number,
    delay = 0,
  ): void {
    const c = this.context();
    if (!c) return;
    const { ctx, out } = c;
    const t0 = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + Math.min(0.02, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(filter).connect(gain).connect(out);
    source.start(t0, Math.random() * 0.5);
    source.stop(t0 + duration + 0.02);
  }

  private ensureLoops(): Loops | null {
    if (this.loops) return this.loops;
    const c = this.context();
    if (!c) return null;
    const { ctx, out } = c;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    const whine = ctx.createOscillator();
    whine.type = 'sine';
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0.35;
    hum.connect(filter);
    whine.connect(whineGain).connect(filter);
    filter.connect(motorGain).connect(out);

    const jet = ctx.createBufferSource();
    jet.buffer = this.noiseBuffer(ctx);
    jet.loop = true;
    const jetFilter = ctx.createBiquadFilter();
    jetFilter.type = 'bandpass';
    jetFilter.frequency.value = 1800;
    jetFilter.Q.value = 0.5;
    const jetGain = ctx.createGain();
    jetGain.gain.value = 0;
    jet.connect(jetFilter).connect(jetGain).connect(out);

    const siren = ctx.createOscillator();
    siren.type = 'square';
    const sirenFilter = ctx.createBiquadFilter();
    sirenFilter.type = 'lowpass';
    sirenFilter.frequency.value = 1600;
    const sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    siren.connect(sirenFilter).connect(sirenGain).connect(out);

    hum.start();
    whine.start();
    jet.start();
    siren.start();
    this.loops = { hum, whine, filter, motorGain, jetGain, siren, sirenGain };
    return this.loops;
  }
}
