import type { BonusType } from '../balance';
import { AudioBank } from './audio-bank';
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

type LoopName = 'engine' | 'jet' | 'siren';
type SoundKey = SfxName | 'coin' | `bonus.${BonusType}` | LoopName;

interface Loop {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const FILES: Readonly<Record<SoundKey, string>> = {
  swipe: 'swipe.mp3',
  jump: 'jump.mp3',
  superJump: 'super-jump.mp3',
  land: 'land.mp3',
  duck: 'duck.mp3',
  dash: 'dash.mp3',
  rampLaunch: 'ramp-launch.mp3',
  lightHit: 'light-hit.mp3',
  crash: 'crash.mp3',
  deco: 'deco.mp3',
  shieldOn: 'shield-on.mp3',
  shieldSave: 'shield-save.mp3',
  shieldEnd: 'shield-end.mp3',
  bonusEnd: 'bonus-end.mp3',
  mission: 'mission.mp3',
  click: 'click.mp3',
  revive: 'revive.mp3',
  coin: 'coin.mp3',
  'bonus.fullTank': 'bonus-full-tank.mp3',
  'bonus.magnet': 'bonus-magnet.mp3',
  'bonus.double': 'bonus-double.mp3',
  'bonus.superJump': 'bonus-super-jump.mp3',
  engine: 'engine-loop.mp3',
  jet: 'jet-loop.mp3',
  siren: 'siren-loop.mp3',
};

const VOLUME: Readonly<Record<SfxName, number>> = {
  swipe: 0.45,
  jump: 0.35,
  superJump: 0.4,
  land: 0.45,
  duck: 0.4,
  dash: 0.55,
  rampLaunch: 0.4,
  lightHit: 0.6,
  crash: 0.75,
  deco: 0.35,
  shieldOn: 0.45,
  shieldSave: 0.7,
  shieldEnd: 0.35,
  bonusEnd: 0.4,
  mission: 0.5,
  click: 0.5,
  revive: 0.55,
};

const LOOP_REGION: Readonly<Record<LoopName, readonly [number, number]>> = {
  engine: [0.15, 3.25],
  jet: [0.15, 2.75],
  siren: [0.15, 3.16],
};

const COIN_VOLUME = 0.45;
const BONUS_VOLUME = 0.5;

export class Sfx {
  private readonly bank: AudioBank<SoundKey>;
  private readonly loops = new Map<LoopName, Loop>();

  constructor(private readonly engine: AudioEngine) {
    this.bank = new AudioBank(engine, FILES);
  }

  preload(): void {
    this.bank.preload();
  }

  update(_dt: number, state: MotorState): void {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const speed = state.running ? state.speed : 6;
    const engine = this.loop('engine');
    if (engine) {
      engine.source.playbackRate.setTargetAtTime(
        0.7 + speed * 0.018 + (state.dashing ? 0.2 : 0),
        now,
        0.15,
      );
      engine.gain.gain.setTargetAtTime(state.running ? 0.14 : 0.05, now, 0.2);
    }
    const jet = this.loop('jet');
    if (jet) jet.gain.gain.setTargetAtTime(state.running && state.dashing ? 0.3 : 0, now, 0.08);
    const siren = this.loop('siren');
    if (siren) {
      siren.gain.gain.setTargetAtTime(state.running && state.droneNear ? 0.4 : 0, now, 0.1);
    }
  }

  silenceLoops(): void {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const loop of this.loops.values()) loop.gain.gain.setTargetAtTime(0, now, 0.05);
  }

  coin(streak: number): void {
    const semis = Math.min(Math.max(streak - 1, 0), 12);
    this.shot('coin', COIN_VOLUME, 2 ** (semis / 12));
  }

  bonus(type: BonusType): void {
    this.shot(`bonus.${type}`, BONUS_VOLUME);
  }

  play(name: SfxName): void {
    this.shot(name, VOLUME[name]);
  }

  private context(): { ctx: AudioContext; out: AudioNode } | null {
    const ctx = this.engine.ctx;
    const out = this.engine.output;
    if (!ctx || !out || ctx.state !== 'running') return null;
    return { ctx, out };
  }

  private shot(key: SoundKey, volume: number, rate = 1): void {
    const c = this.context();
    const buffer = this.bank.get(key);
    if (!c || !buffer) return;
    const { ctx, out } = c;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(out);
    source.start();
  }

  private loop(name: LoopName): Loop | null {
    const existing = this.loops.get(name);
    if (existing) return existing;
    const c = this.context();
    const buffer = this.bank.get(name);
    if (!c || !buffer) return null;
    const { ctx, out } = c;
    const [start, end] = LOOP_REGION[name];
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = start;
    source.loopEnd = Math.min(end, buffer.duration);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(out);
    source.start(0, start);
    const loop = { source, gain };
    this.loops.set(name, loop);
    return loop;
  }
}
