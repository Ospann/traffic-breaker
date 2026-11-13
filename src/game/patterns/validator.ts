import { LANES, player } from '../balance';
import type { Action } from '../input/actions';
import { classifyHit, supportAt, type PlayerPose, type Support } from '../sim/collision';
import { laneX, PlayerMotion } from '../sim/player-motion';
import { obstacleSpecs, type ObstacleSpec, type ObstacleType } from '../world/entities';
import type { Pattern } from './pattern-schema';

export interface ValidatorOptions {
  decisionSec: number;
  dt: number;
}

export const defaultValidatorOptions: ValidatorOptions = {
  decisionSec: 0.1,
  dt: 1 / 120,
};

interface Placed {
  type: ObstacleType;
  spec: ObstacleSpec;
  x: number;
  z: number;
}

interface Course {
  id: string;
  length: number;
  obstacles: Placed[];
}

export interface ProbeState {
  motion: PlayerMotion;
  p: number;
}

export interface PatternReport {
  ok: boolean;
  failedLanes: number[];
}

const ACTIONS: readonly (Action | null)[] = [null, 'left', 'right', 'up', 'down'];
const LOOK_BEHIND = player.halfLength + 16;
const LOOK_AHEAD = 60;

function toCourse(pattern: Pattern): Course {
  return {
    id: pattern.id,
    length: pattern.length,
    obstacles: pattern.obstacles
      .map((o) => ({
        type: o.type,
        spec: obstacleSpecs[o.type],
        x: laneX(o.lane) + (o.offsetX ?? 0),
        z: o.z,
      }))
      .filter((o) => o.spec.solid),
  };
}

export function stateKey(state: ProbeState): string {
  const m = state.motion;
  return [
    m.lane,
    m.prevLane,
    Math.round(m.laneProgress * 4),
    m.mode,
    Math.round(m.y * 4),
    Math.round(m.vy / 1.5),
    Math.round(m.duckTimer * 8),
    m.gliding ? 1 : 0,
    m.onRamp ? 1 : 0,
  ].join(':');
}

function realD(o: Placed, p: number, speed: number): number {
  const rel = o.z - p;
  return o.spec.approachSpeed > 0 ? rel * (1 + o.spec.approachSpeed / speed) : rel;
}

class Simulator {
  private readonly support: Support = { height: 0, ramp: false };
  private readonly surfaces: { x: number; d: number; spec: ObstacleSpec }[] = [];
  private readonly prevPose: PlayerPose = { x: 0, y: 0, height: 0 };
  private readonly pose: PlayerPose = { x: 0, y: 0, height: 0 };

  constructor(
    private readonly speed: number,
    private readonly options: ValidatorOptions,
  ) {}

  advance(course: Course, from: ProbeState, action: Action | null): ProbeState | null {
    const motion = new PlayerMotion();
    motion.copyFrom(from.motion);
    if (action) {
      if (!motion.canPerform(action, false)) return null;
      motion.perform(action);
    }
    let p = from.p;
    const { dt, decisionSec } = this.options;
    const steps = Math.round(decisionSec / dt);
    for (let i = 0; i < steps; i += 1) {
      const prevP = p;
      p += this.speed * dt;
      const near = this.nearby(course, p);
      this.surfaces.length = 0;
      for (const o of near) {
        if (o.spec.roof) this.surfaces.push({ x: o.x, d: realD(o, p, this.speed), spec: o.spec });
      }
      supportAt(this.surfaces, motion.x, motion.y, this.support);
      motion.setGround(this.support.height, this.support.ramp);
      this.prevPose.x = motion.x;
      this.prevPose.y = motion.y;
      this.prevPose.height = motion.height;
      this.prevPose.frontLift = motion.frontLift;
      motion.update(dt);
      this.pose.x = motion.x;
      this.pose.y = motion.y;
      this.pose.height = motion.height;
      this.pose.frontLift = motion.frontLift;
      for (const o of near) {
        const now = { x: o.x, d: realD(o, p, this.speed) };
        const prev = { x: o.x, d: realD(o, prevP, this.speed) };
        if (classifyHit(this.pose, this.prevPose, now, prev, o.spec)) return null;
      }
      motion.events.length = 0;
    }
    return { motion, p };
  }

  private nearby(course: Course, p: number): Placed[] {
    return course.obstacles.filter((o) => {
      const d = realD(o, p, this.speed);
      return d < LOOK_AHEAD && d + o.spec.length > -LOOK_BEHIND;
    });
  }
}

export function startState(lane: number): ProbeState {
  const motion = new PlayerMotion();
  motion.lane = lane;
  motion.prevLane = lane;
  motion.x = laneX(lane);
  motion.copyFrom(motion);
  return { motion, p: 0 };
}

function shift(state: ProbeState, by: number): ProbeState {
  return { motion: state.motion, p: state.p - by };
}

export function exploreAll(
  course: Course,
  speed: number,
  starts: ProbeState[],
  options: ValidatorOptions = defaultValidatorOptions,
): ProbeState[] {
  const sim = new Simulator(speed, options);
  let frontier = new Map<string, ProbeState>();
  for (const s of starts) frontier.set(stateKey(s), s);
  const ends = new Map<string, ProbeState>();
  while (frontier.size > 0) {
    const next = new Map<string, ProbeState>();
    for (const state of frontier.values()) {
      for (const action of ACTIONS) {
        const result = sim.advance(course, state, action);
        if (!result) continue;
        const key = stateKey(result);
        if (result.p >= course.length) {
          if (!ends.has(key)) ends.set(key, shift(result, course.length));
        } else if (!next.has(key)) {
          next.set(key, result);
        }
      }
    }
    frontier = next;
  }
  return [...ends.values()];
}

export function canFinish(
  course: Course,
  speed: number,
  start: ProbeState,
  options: ValidatorOptions = defaultValidatorOptions,
): boolean {
  const sim = new Simulator(speed, options);
  const visited = new Set<string>();
  const stack: ProbeState[] = [start];
  while (stack.length > 0) {
    const state = stack.pop();
    if (!state) break;
    for (let i = ACTIONS.length - 1; i >= 0; i -= 1) {
      const result = sim.advance(course, state, ACTIONS[i] ?? null);
      if (!result) continue;
      if (result.p >= course.length) return true;
      const key = `${Math.floor(result.p * 10)}|${stateKey(result)}`;
      if (visited.has(key)) continue;
      visited.add(key);
      stack.push(result);
    }
  }
  return false;
}

export class PassValidator {
  private readonly courses = new Map<string, Course>();
  private readonly endsCache = new Map<string, ProbeState[]>();
  private readonly winCache = new Map<string, boolean>();

  constructor(private readonly options: ValidatorOptions = defaultValidatorOptions) {}

  patternEnds(pattern: Pattern, speed: number, lane: number): ProbeState[] {
    const key = `${pattern.id}@${speed}#${lane}`;
    const cached = this.endsCache.get(key);
    if (cached) return cached;
    const ends = exploreAll(this.course(pattern), speed, [startState(lane)], this.options);
    this.endsCache.set(key, ends);
    return ends;
  }

  validatePattern(pattern: Pattern, speed: number): PatternReport {
    const failedLanes: number[] = [];
    for (let lane = 0; lane < LANES; lane += 1) {
      if (this.patternEnds(pattern, speed, lane).length === 0) failedLanes.push(lane);
    }
    return { ok: failedLanes.length === 0, failedLanes };
  }

  validateJunction(a: Pattern, b: Pattern, speed: number): PatternReport {
    const failedLanes: number[] = [];
    for (let lane = 0; lane < LANES; lane += 1) {
      const ends = this.patternEnds(a, speed, lane);
      if (!ends.some((end) => this.wins(b, speed, end))) failedLanes.push(lane);
    }
    return { ok: failedLanes.length === 0, failedLanes };
  }

  private wins(pattern: Pattern, speed: number, start: ProbeState): boolean {
    const key = `${pattern.id}@${speed}|${stateKey(start)}`;
    const cached = this.winCache.get(key);
    if (cached !== undefined) return cached;
    const result = canFinish(this.course(pattern), speed, start, this.options);
    this.winCache.set(key, result);
    return result;
  }

  private course(pattern: Pattern): Course {
    let course = this.courses.get(pattern.id);
    if (!course) {
      course = toCourse(pattern);
      this.courses.set(pattern.id, course);
    }
    return course;
  }
}
