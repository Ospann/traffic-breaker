import { describe, expect, it } from 'vitest';
import { revive, shield } from '../src/game/balance';
import { parsePattern } from '../src/game/patterns/pattern-schema';
import { defaultRunConfig, RunSession } from '../src/game/sim/run-session';
import { SequentialSource } from '../src/game/world/sequential-source';

const DT = 1 / 120;
const walls = parsePattern(
  {
    id: 'walls',
    length: 60,
    difficulty: 1,
    tags: [],
    obstacles: [0, 1, 2].map((lane) => ({ type: 'lowBarrier', lane, z: 30 })),
    coins: [],
  },
  'walls',
);

function crashSession(): RunSession {
  const s = new RunSession(new SequentialSource([walls]));
  s.reset({ ...defaultRunConfig });
  for (let t = 0; t < 20 && s.state === 'running'; t += DT) s.step(DT);
  return s;
}

describe('revive', () => {
  it('continues a crashed run with invulnerability and a cleared road', () => {
    const s = crashSession();
    expect(s.state).not.toBe('running');
    const distance = s.distance;
    const coins = s.coins;
    expect(s.canRevive).toBe(true);
    expect(s.revive()).toBe(true);
    expect(s.state).toBe('running');
    expect(s.motion.isInvulnerable).toBe(true);
    expect(s.track.active.every((e) => e.d >= revive.clearMeters)).toBe(true);
    expect(s.distance).toBe(distance);
    expect(s.coins).toBe(coins);
    expect(s.drone.isNear).toBe(false);
    expect(s.events.some((e) => e.type === 'revive')).toBe(true);
  });

  it('allows at most two continues per run', () => {
    const s = crashSession();
    for (let i = 0; i < revive.maxPerRun; i += 1) {
      expect(s.revive()).toBe(true);
      for (let t = 0; t < 30 && s.state === 'running'; t += DT) s.step(DT);
      expect(s.state).not.toBe('running');
    }
    expect(s.canRevive).toBe(false);
    expect(s.revive()).toBe(false);
  });

  it('cannot revive a running session', () => {
    const s = new RunSession(new SequentialSource([walls]));
    s.reset();
    expect(s.revive()).toBe(false);
  });

  it('boosted start gives an active shield and a full meter without spending stock', () => {
    const s = new RunSession(new SequentialSource([walls]));
    s.reset({ ...defaultRunConfig, shields: 1, startShield: true, startWithFullThrust: true });
    expect(s.shieldActive).toBe(true);
    expect(s.shieldTimer).toBe(shield.durationSec);
    expect(s.shields).toBe(1);
    expect(s.thrust.isFull).toBe(true);
  });
});
