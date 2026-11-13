export type MissionMetric =
  | 'coins'
  | 'distance'
  | 'score'
  | 'jumps'
  | 'barriersJumped'
  | 'ducksUnder'
  | 'dashes'
  | 'roofs'
  | 'rampLaunches'
  | 'bonuses';

export type MissionScope = 'run' | 'total';

export interface MissionSpec {
  metric: MissionMetric;
  target: number;
  scope: MissionScope;
}

export type RunMetrics = Readonly<Record<MissionMetric, number>>;

export const MISSIONS_PER_SET = 3;

const m = (metric: MissionMetric, target: number, scope: MissionScope): MissionSpec => ({
  metric,
  target,
  scope,
});

export const missionSets: readonly (readonly MissionSpec[])[] = [
  [m('coins', 50, 'run'), m('jumps', 10, 'total'), m('distance', 500, 'run')],
  [m('barriersJumped', 10, 'total'), m('dashes', 2, 'total'), m('coins', 100, 'run')],
  [m('roofs', 5, 'total'), m('ducksUnder', 10, 'total'), m('score', 2000, 'run')],
  [m('bonuses', 3, 'total'), m('rampLaunches', 3, 'total'), m('distance', 1000, 'run')],
  [m('coins', 300, 'run'), m('roofs', 20, 'total'), m('jumps', 30, 'total')],
  [m('dashes', 5, 'run'), m('barriersJumped', 30, 'total'), m('score', 5000, 'run')],
  [m('bonuses', 2, 'run'), m('ducksUnder', 25, 'total'), m('distance', 2000, 'run')],
  [m('coins', 500, 'run'), m('roofs', 10, 'run'), m('rampLaunches', 6, 'total')],
  [m('score', 12000, 'run'), m('dashes', 15, 'total'), m('bonuses', 10, 'total')],
  [m('distance', 3000, 'run'), m('coins', 2000, 'total'), m('barriersJumped', 60, 'total')],
];

export function missionSet(index: number): MissionSpec[] {
  const safe = Math.max(0, Math.floor(index));
  const cycle = Math.floor(safe / missionSets.length);
  const base = missionSets[safe % missionSets.length] ?? missionSets[0] ?? [];
  const scale = 1 + 0.5 * cycle;
  return base.map((spec) => ({ ...spec, target: Math.round(spec.target * scale) }));
}

export interface MissionState {
  set: number;
  progress: number[];
  done: boolean[];
}

export function emptyMissionState(set = 0): MissionState {
  return {
    set,
    progress: Array.from({ length: MISSIONS_PER_SET }, () => 0),
    done: Array.from({ length: MISSIONS_PER_SET }, () => false),
  };
}

export function missionValue(
  spec: MissionSpec,
  state: MissionState,
  index: number,
  run: RunMetrics,
): number {
  const runValue = run[spec.metric];
  return spec.scope === 'run' ? runValue : (state.progress[index] ?? 0) + runValue;
}

export function liveCompleted(state: MissionState, run: RunMetrics): boolean[] {
  return missionSet(state.set).map(
    (spec, i) => (state.done[i] ?? false) || missionValue(spec, state, i, run) >= spec.target,
  );
}

export interface CommitResult {
  state: MissionState;
  completedNow: number[];
  setsCompleted: number;
}

export function commitRun(previous: MissionState, run: RunMetrics): CommitResult {
  const specs = missionSet(previous.set);
  const state: MissionState = {
    set: previous.set,
    progress: [...previous.progress],
    done: [...previous.done],
  };
  const completedNow: number[] = [];
  specs.forEach((spec, i) => {
    if (state.done[i]) return;
    const value = missionValue(spec, state, i, run);
    if (spec.scope === 'total') state.progress[i] = Math.min(value, spec.target);
    if (value >= spec.target) {
      state.done[i] = true;
      completedNow.push(i);
    }
  });
  let setsCompleted = 0;
  let next = state;
  if (next.done.every(Boolean)) {
    setsCompleted = 1;
    next = emptyMissionState(state.set + 1);
  }
  return { state: next, completedNow, setsCompleted };
}
