import { describe, expect, it } from 'vitest';
import { player } from '../src/game/balance';
import { classifyHit } from '../src/game/sim/collision';
import { laneX } from '../src/game/sim/player-motion';
import { obstacleSpecs } from '../src/game/world/entities';

const ground = (x: number, height: number = player.height) => ({ x, y: 0, height });

describe('collision', () => {
  const barrier = obstacleSpecs.lowBarrier;

  it('a head-on hit in the same lane is a crash', () => {
    const now = { x: laneX(1), d: player.halfLength - 0.1 };
    const prev = { x: laneX(1), d: player.halfLength + 0.2 };
    expect(classifyHit(ground(laneX(1)), ground(laneX(1)), now, prev, barrier)).toBe('front');
  });

  it('hitting the side while changing lanes is a light hit', () => {
    const truck = obstacleSpecs.truck;
    const o = { x: laneX(1), d: -3 };
    const prevX = laneX(0) + 0.5;
    const nowX = laneX(0) + 0.9;
    expect(classifyHit(ground(nowX), ground(prevX), o, o, truck)).toBe('side');
  });

  it('clipping the corner is a graze', () => {
    const o = { x: laneX(1), d: 1.5 };
    const prev = { x: laneX(1), d: 2 };
    const x = laneX(0) + 1.0;
    expect(classifyHit(ground(x), ground(x), o, prev, barrier)).toBe('graze');
  });

  it('jumping over a low barrier and ducking under a high sign are clean', () => {
    const o = { x: laneX(1), d: 0 };
    expect(classifyHit({ x: 0, y: 1, height: player.height }, ground(0), o, o, barrier)).toBeNull();
    const sign = obstacleSpecs.highSign;
    expect(classifyHit(ground(0, player.duckHeight), ground(0), o, o, sign)).toBeNull();
    expect(classifyHit(ground(0), ground(0), o, { x: 0, d: 2 }, sign)).toBe('front');
  });

  it('mid barrier can be ducked or jumped', () => {
    const mid = obstacleSpecs.midBarrier;
    const o = { x: 0, d: 0 };
    expect(classifyHit(ground(0, player.duckHeight), ground(0), o, o, mid)).toBeNull();
    expect(classifyHit({ x: 0, y: 1.5, height: player.height }, ground(0), o, o, mid)).toBeNull();
  });
});
