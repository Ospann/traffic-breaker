export const LANES = 3;
export const LANE_WIDTH = 2.6;

export const speedCurve = {
  startSpeed: 15,
  maxSpeed: 32,
  rampSec: 180,
} as const;

export function speedAt(elapsedSec: number): number {
  const t = Math.min(Math.max(elapsedSec / speedCurve.rampSec, 0), 1);
  const eased = 1 - (1 - t) * (1 - t);
  return speedCurve.startSpeed + (speedCurve.maxSpeed - speedCurve.startSpeed) * eased;
}

export const player = {
  halfWidth: 0.8,
  halfLength: 1.9,
  height: 1.1,
  duckHeight: 0.55,
  laneChangeSec: 0.16,
  jumpHeight: 2.4,
  jumpAirSec: 0.66,
  fastDropSpeed: 26,
  duckSec: 0.62,
  roofStepTolerance: 0.3,
  roofOverhang: 1.2,
} as const;

export const jumpGravity = (8 * player.jumpHeight) / (player.jumpAirSec * player.jumpAirSec);
export const jumpVelocity = (4 * player.jumpHeight) / player.jumpAirSec;

export const ramp = {
  launchVelocity: 6,
  glideGravityScale: 0.5,
} as const;

export const collision = {
  grazeOverlap: 0.6,
} as const;

export const thrust = {
  chargeSec: 30,
  dashSec: 2.6,
  dashAltitude: 4.4,
  dashRiseSec: 0.35,
  descendSpeed: 7,
  landingInvulnSec: 0.7,
} as const;

export const drone = {
  nearSec: 4,
} as const;

export const crash = {
  gameOverDelaySec: 1.3,
} as const;

export const track = {
  spawnAheadDistance: 170,
  despawnBehind: 15,
} as const;

export const score = {
  pointsPerMeter: 1,
} as const;

export const generator = {
  rampSec: 200,
  weights: [
    { at: 0, w: [1, 0.1, 0] },
    { at: 0.25, w: [0.8, 0.6, 0.05] },
    { at: 0.5, w: [0.45, 0.9, 0.35] },
    { at: 1, w: [0.2, 0.8, 1] },
  ],
  breatherAfterDifficulty: 3,
  recentMemory: 4,
} as const;

export function difficultyWeights(elapsedSec: number): [number, number, number] {
  const t = Math.min(Math.max(elapsedSec / generator.rampSec, 0), 1);
  const points = generator.weights;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b || t > b.at) continue;
    const k = (t - a.at) / (b.at - a.at);
    const lerp = (j: number): number => (a.w[j] ?? 0) + ((b.w[j] ?? 0) - (a.w[j] ?? 0)) * k;
    return [lerp(0), lerp(1), lerp(2)];
  }
  const last = points[points.length - 1];
  return [last?.w[0] ?? 1, last?.w[1] ?? 0, last?.w[2] ?? 0];
}
