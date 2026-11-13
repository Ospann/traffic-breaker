import { describe, expect, it } from 'vitest';
import {
  commitRun,
  emptyMissionState,
  liveCompleted,
  missionSet,
  missionSets,
  MISSIONS_PER_SET,
  type RunMetrics,
} from '../src/game/progression/missions';

const zero: RunMetrics = {
  coins: 0,
  distance: 0,
  score: 0,
  jumps: 0,
  barriersJumped: 0,
  ducksUnder: 0,
  dashes: 0,
  roofs: 0,
  rampLaunches: 0,
  bonuses: 0,
};

describe('missions', () => {
  it('every set has three missions with positive targets', () => {
    for (const set of missionSets) {
      expect(set).toHaveLength(MISSIONS_PER_SET);
      for (const spec of set) expect(spec.target).toBeGreaterThan(0);
    }
  });

  it('after the list ends, sets cycle with bigger targets', () => {
    const first = missionSet(0);
    const cycled = missionSet(missionSets.length);
    expect(cycled.map((s) => s.metric)).toEqual(first.map((s) => s.metric));
    cycled.forEach((spec, i) => expect(spec.target).toBeGreaterThan(first[i]?.target ?? 0));
  });

  it('run-scope missions need the target within one run', () => {
    const state = emptyMissionState(0);
    const runIndex = missionSet(0).findIndex((s) => s.scope === 'run' && s.metric === 'coins');
    const target = missionSet(0)[runIndex]?.target ?? 0;
    const half = { ...zero, coins: target / 2 };
    const a = commitRun(state, half);
    expect(a.state.done[runIndex]).toBe(false);
    const b = commitRun(a.state, half);
    expect(b.state.done[runIndex]).toBe(false);
    const c = commitRun(b.state, { ...zero, coins: target });
    expect(c.completedNow).toContain(runIndex);
  });

  it('total-scope missions accumulate across runs', () => {
    const state = emptyMissionState(0);
    const index = missionSet(0).findIndex((s) => s.scope === 'total');
    const spec = missionSet(0)[index];
    if (!spec) throw new Error('no total mission in set 0');
    const part = { ...zero, [spec.metric]: Math.ceil(spec.target / 3) };
    let current = state;
    for (let i = 0; i < 2; i += 1) current = commitRun(current, part).state;
    expect(current.done[index]).toBe(false);
    expect(current.progress[index]).toBe(Math.ceil(spec.target / 3) * 2);
    const done = commitRun(current, part);
    expect(done.completedNow).toContain(index);
  });

  it('live check sees completion during a run without committing', () => {
    const state = emptyMissionState(0);
    const specs = missionSet(0);
    const metrics = { ...zero };
    for (const spec of specs) metrics[spec.metric] = spec.target;
    expect(liveCompleted(state, metrics)).toEqual([true, true, true]);
    expect(state.done).toEqual([false, false, false]);
  });

  it('completing all three starts the next set', () => {
    const metrics = { ...zero };
    for (const spec of missionSet(0)) metrics[spec.metric] = spec.target;
    const result = commitRun(emptyMissionState(0), metrics);
    expect(result.setsCompleted).toBe(1);
    expect(result.state).toEqual(emptyMissionState(1));
  });

  it('includes the missions from the brief', () => {
    const all = missionSets.flat();
    expect(all).toContainEqual({ metric: 'coins', target: 300, scope: 'run' });
    expect(all).toContainEqual({ metric: 'roofs', target: 20, scope: 'total' });
    expect(all).toContainEqual({ metric: 'dashes', target: 5, scope: 'run' });
    expect(all).toContainEqual({ metric: 'barriersJumped', target: 30, scope: 'total' });
  });
});
