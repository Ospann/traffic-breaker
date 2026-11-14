import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/game/audio/audio-engine';
import { playSessionSounds } from '../src/game/audio/session-sounds';
import { Sfx } from '../src/game/audio/sfx';
import { RunSession } from '../src/game/sim/run-session';
import { patterns } from '../src/game/patterns';
import { SequentialSource } from '../src/game/world/sequential-source';

describe('audio without a running AudioContext', () => {
  it('is silent and never throws', () => {
    const engine = new AudioEngine();
    engine.setMuted(true);
    engine.setMuted(false);
    const sfx = new Sfx(engine);
    expect(() => {
      sfx.update(0.016, { speed: 20, running: true, dashing: true, droneNear: true });
      sfx.coin(12);
      sfx.bonus('magnet');
      sfx.play('crash');
      sfx.silenceLoops();
      const session = new RunSession(new SequentialSource(patterns));
      session.reset();
      playSessionSounds(sfx, [{ type: 'jump' }, { type: 'coin', streak: 3, x: 0, y: 1 }], session);
    }).not.toThrow();
  });
});
