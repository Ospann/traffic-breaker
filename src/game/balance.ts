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
} as const;

export const jumpGravity = (8 * player.jumpHeight) / (player.jumpAirSec * player.jumpAirSec);
export const jumpVelocity = (4 * player.jumpHeight) / player.jumpAirSec;

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
