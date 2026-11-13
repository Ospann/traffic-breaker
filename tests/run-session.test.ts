import { describe, expect, it, vi } from 'vitest';
import { player } from '../src/game/balance';
import { patterns } from '../src/game/patterns';
import type { Pattern } from '../src/game/patterns/pattern-schema';
import { laneX } from '../src/game/sim/player-motion';
import { RunSession } from '../src/game/sim/run-session';
import { obstacleSpecs } from '../src/game/world/entities';
import { SequentialSource } from '../src/game/world/sequential-source';
import { Track, TRACK_ENTITY_CAPACITY } from '../src/game/world/track';

const DT = 1 / 120;

describe('RunSession', () => {
  it('loads the stage 1 test patterns', () => {
    expect(patterns.length).toBeGreaterThanOrEqual(5);
  });

  it('streams patterns for minutes without exhausting pools', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const session = new RunSession(new SequentialSource(patterns));
    let maxActive = 0;
    for (let t = 0; t < 240; t += DT) {
      session.motion.grantInvulnerability(1);
      session.step(DT);
      maxActive = Math.max(maxActive, session.track.active.length);
    }
    expect(session.state).toBe('running');
    expect(maxActive).toBeLessThan(TRACK_ENTITY_CAPACITY);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('crashes on a head-on hit and ends the run after the delay', () => {
    const session = new RunSession(new SequentialSource(patterns));
    for (let t = 0; t < 60 && session.state === 'running'; t += DT) session.step(DT);
    expect(session.state).toBe('crashed');
    expect(session.events.some((event) => event.type === 'crash')).toBe(true);
    for (let t = 0; t < 2; t += DT) session.step(DT);
    expect(session.state).toBe('over');
  });

  it('second light hit while the drone is near is a crash', () => {
    const session = new RunSession(new SequentialSource(patterns));
    expect(session.drone.lightHit()).toBe('warned');
    expect(session.drone.lightHit()).toBe('caught');
  });

  it('a truck roof supports the car only from above', () => {
    const truckOnly: Pattern = {
      id: 'truck-only',
      length: 60,
      difficulty: 1,
      tags: [],
      obstacles: [{ type: 'truck', lane: 1, z: 10 }],
      coins: [],
    };
    const track = new Track(new SequentialSource([truckOnly]));
    const truck = obstacleSpecs.truck;
    track.update(DT, 15);
    const first = track.active[0];
    expect(first?.type).toBe('truck');
    while ((first?.d ?? 0) > -truck.length / 2) track.update(DT, 15);
    expect(track.supportHeight(laneX(1), truck.y1 + 1)).toBe(truck.y1);
    expect(track.supportHeight(laneX(1), truck.y1 - player.roofStepTolerance / 2)).toBe(truck.y1);
    expect(track.supportHeight(laneX(1), 0)).toBe(0);
    expect(track.supportHeight(laneX(0), truck.y1 + 1)).toBe(0);
  });
});
