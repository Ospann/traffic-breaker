import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioBank } from '../src/game/audio/audio-bank';
import { AudioEngine } from '../src/game/audio/audio-engine';
import { Music } from '../src/game/audio/music';
import { playSessionSounds } from '../src/game/audio/session-sounds';
import { Sfx } from '../src/game/audio/sfx';
import { RunSession } from '../src/game/sim/run-session';
import { patterns } from '../src/game/patterns';
import { SequentialSource } from '../src/game/world/sequential-source';

const root = join(import.meta.dirname, '..');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('audio without a running AudioContext', () => {
  it('is silent and never throws', () => {
    const engine = new AudioEngine();
    engine.setMuted(true);
    engine.setMuted(false);
    const sfx = new Sfx(engine);
    const music = new Music(engine);
    expect(() => {
      sfx.update(0.016, { speed: 20, running: true, dashing: true, droneNear: true });
      sfx.coin(12);
      sfx.bonus('magnet');
      sfx.play('crash');
      sfx.silenceLoops();
      music.play('menu');
      music.play('run');
      music.play(null);
      const session = new RunSession(new SequentialSource(patterns));
      session.reset();
      playSessionSounds(sfx, [{ type: 'jump' }, { type: 'coin', streak: 3, x: 0, y: 1 }], session);
    }).not.toThrow();
  });

  it('notifies listeners about mute changes', () => {
    const engine = new AudioEngine();
    const listener = vi.fn<() => void>();
    const off = engine.onChange(listener);
    engine.setMuted(true);
    expect(engine.isMuted).toBe(true);
    off();
    engine.setMuted(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('audio bank', () => {
  it('survives files that fail to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const bank = new AudioBank(new AudioEngine(), { crash: 'crash.mp3' });
    bank.preload();
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('assets/audio/crash.mp3');
    expect(bank.get('crash')).toBeNull();
  });
});

describe('audio assets', () => {
  it('ships every referenced file as mp3 and no synthesis code', () => {
    const shipped = new Set(readdirSync(join(root, 'public/assets/audio')));
    const sources = ['sfx.ts', 'music.ts'].map((file) =>
      readFileSync(join(root, 'src/game/audio', file), 'utf8'),
    );
    const referenced = sources.flatMap((text) => [...text.matchAll(/'([\w-]+\.mp3)'/g)]);
    expect(referenced.length).toBeGreaterThan(20);
    for (const match of referenced) expect(shipped.has(match[1] ?? '')).toBe(true);
    for (const text of sources) {
      expect(text).not.toMatch(/createOscillator|createBuffer\(|getChannelData/);
    }
  });
});
