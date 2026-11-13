import { describe, expect, it, vi } from 'vitest';
import {
  bonusDuration,
  bonuses,
  coins as coinBalance,
  shield,
  superJump,
  thrust,
} from '../src/game/balance';
import { patterns } from '../src/game/patterns';
import { parsePattern, type Pattern } from '../src/game/patterns/pattern-schema';
import { defaultRunConfig, RunSession, type RunConfig } from '../src/game/sim/run-session';
import { obstacleSpecs } from '../src/game/world/entities';
import { PatternGenerator } from '../src/game/world/pattern-generator';
import { COIN_CAPACITY } from '../src/game/world/pickups';
import { SequentialSource } from '../src/game/world/sequential-source';

const DT = 1 / 120;

function pattern(id: string, obstacles: unknown[], coins: unknown[] = [], length = 80): Pattern {
  return parsePattern({ id, length, difficulty: 1, tags: [], obstacles, coins }, id);
}

function session(list: Pattern[], config: Partial<RunConfig> = {}): RunSession {
  const s = new RunSession(new SequentialSource(list));
  s.reset({ ...defaultRunConfig, ...config });
  s.track.pickups.bonusesEnabled = false;
  return s;
}

function run(s: RunSession, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds && s.state === 'running'; t += DT) {
    each?.();
    s.step(DT);
  }
}

const coinLanes = pattern(
  'coin-lanes',
  [],
  [
    { kind: 'line', lane: 0, z: 10, count: 10 },
    { kind: 'line', lane: 1, z: 10, count: 10 },
    { kind: 'line', lane: 2, z: 10, count: 10 },
  ],
);

describe('coins', () => {
  it('collects coins in its lane, scores them and charges thrust', () => {
    const s = session([coinLanes]);
    run(s, 6.5);
    expect(s.coins).toBeGreaterThanOrEqual(10);
    expect(s.coins).toBeLessThan(25);
    expect(s.score).toBeGreaterThan(s.distance + s.coins * coinBalance.points - 2);
    expect(s.thrust.level).toBeGreaterThan(6.5 / thrust.chargeSec + 9 * coinBalance.thrustCharge);
    expect(s.events.some((e) => e.type === 'coin' && e.streak >= 5)).toBe(true);
  });

  it('magnet pulls coins from neighbouring lanes', () => {
    const plain = session([coinLanes]);
    run(plain, 6.5);
    const magnet = session([coinLanes]);
    magnet.activateBonus('magnet');
    run(magnet, 6.5);
    expect(magnet.coins).toBeGreaterThan(plain.coins * 2);
  });

  it('x2 doubles score accrual while active', () => {
    const empty = pattern('empty', []);
    const a = session([empty]);
    const b = session([empty]);
    b.activateBonus('double');
    run(a, 3);
    run(b, 3);
    expect(b.score).toBeGreaterThan(a.score * 1.9);
    expect(b.scoreMultiplier).toBe(2);
  });

  it('streams patterns with coins for minutes without exhausting the coin pool', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = new RunSession(new PatternGenerator(patterns, () => 3));
    s.reset({ ...defaultRunConfig, seed: 3 });
    let maxCoins = 0;
    run(s, 300, () => {
      s.motion.grantInvulnerability(1);
      maxCoins = Math.max(maxCoins, s.track.pickups.coins.length);
    });
    expect(s.state).toBe('running');
    expect(maxCoins).toBeLessThan(COIN_CAPACITY);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('bonuses', () => {
  it('durations grow with upgrade level and full tank stays within 6–8 s', () => {
    expect(bonusDuration('magnet', 3)).toBeGreaterThan(bonusDuration('magnet', 0));
    expect(bonusDuration('fullTank', 0)).toBeGreaterThanOrEqual(6);
    expect(bonusDuration('fullTank', bonuses.maxLevel)).toBeLessThanOrEqual(8);
    expect(bonusDuration('fullTank', 99)).toBe(bonusDuration('fullTank', bonuses.maxLevel));
  });

  it('spawns bonus pickups on the track at the configured spacing', () => {
    const s = new RunSession(new PatternGenerator(patterns, () => 9));
    s.reset({ ...defaultRunConfig, seed: 9 });
    let previous = 0;
    let spawned = 0;
    run(s, 120, () => {
      s.motion.grantInvulnerability(1);
      const now = s.track.pickups.bonuses.length;
      if (now > previous) spawned += now - previous;
      previous = now;
    });
    expect(spawned).toBeGreaterThanOrEqual(3);
    expect(spawned).toBeLessThanOrEqual(10);
  });

  it('super jump clears a parked truck', () => {
    const truck = pattern('truck', [{ type: 'truck', lane: 1, z: 30 }]);
    const s = session([truck], { upgrades: { ...defaultRunConfig.upgrades, superJump: 0 } });
    s.activateBonus('superJump');
    let jumped = false;
    run(s, 8, () => {
      const front = s.track.active.find((e) => e.type === 'truck');
      if (!jumped && front && front.d < 6) {
        s.queue('up');
        jumped = true;
      }
    });
    expect(jumped).toBe(true);
    expect(s.state).toBe('running');
    expect(superJump.height).toBeGreaterThan(obstacleSpecs.truck.y1);
  });

  it('without super jump the same truck is a crash', () => {
    const truck = pattern('truck', [{ type: 'truck', lane: 1, z: 30 }]);
    const s = session([truck]);
    let jumped = false;
    run(s, 8, () => {
      const front = s.track.active.find((e) => e.type === 'truck');
      if (!jumped && front && front.d < 6) {
        s.queue('up');
        jumped = true;
      }
    });
    expect(s.state).not.toBe('running');
  });

  it('full tank fills thrust, flies over traffic and lays a coin trail', () => {
    const wall = pattern(
      'wall',
      [0, 1, 2].map((lane) => ({ type: 'truck', lane, z: 40 })),
    );
    const s = session([wall]);
    s.activateBonus('fullTank');
    expect(s.thrust.isFull).toBe(true);
    expect(s.motion.isDashing).toBe(true);
    const trail = s.track.pickups.coins.length;
    expect(trail).toBeGreaterThan(20);
    let cooldown = 0;
    run(s, bonusDuration('fullTank', 0) - 0.2, () => {
      cooldown -= DT;
      const next = s.track.pickups.coins
        .filter((c) => c.d > 2)
        .reduce<{ d: number; lane: number } | null>((a, c) => (!a || c.d < a.d ? c : a), null);
      if (!next || cooldown > 0 || next.lane === s.motion.lane || next.d > 10) return;
      s.queue(next.lane < s.motion.lane ? 'left' : 'right');
      cooldown = 0.25;
    });
    expect(s.state).toBe('running');
    expect(s.coins).toBeGreaterThan(trail * 0.7);
  });
});

describe('shield', () => {
  const wall = pattern(
    'wall',
    [0, 1, 2].map((lane) => ({ type: 'lowBarrier', lane, z: 20 })),
    [],
    40,
  );

  it('cannot be activated without shields', () => {
    const s = session([wall]);
    s.queue('shield');
    run(s, 0.1);
    expect(s.shieldActive).toBe(false);
  });

  it('absorbs exactly one crash and is consumed', () => {
    const s = session([wall], { shields: 2 });
    s.queue('shield');
    run(s, 0.1);
    expect(s.shieldActive).toBe(true);
    expect(s.shields).toBe(1);
    run(s, 4.5);
    expect(s.state).toBe('running');
    expect(s.shieldActive).toBe(false);
    expect(s.events.some((e) => e.type === 'shieldSave')).toBe(true);
    run(s, 3);
    expect(s.state).not.toBe('running');
  });

  it('expires after its duration', () => {
    const s = session([pattern('empty', [])], { shields: 1 });
    s.queue('shield');
    run(s, shield.durationSec + 0.5);
    expect(s.shieldActive).toBe(false);
    expect(s.events.some((e) => e.type === 'shieldEnd')).toBe(true);
  });
});
