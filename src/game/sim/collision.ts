import { collision, player } from '../balance';
import type { ObstacleSpec } from '../world/entities';

export type HitKind = 'front' | 'side' | 'graze' | 'vertical';

export interface PlayerPose {
  x: number;
  y: number;
  height: number;
}

export interface ObstaclePose {
  x: number;
  d: number;
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function solidTop(spec: ObstacleSpec): number {
  return spec.roof ? spec.y1 - player.roofStepTolerance : spec.y1;
}

function overlaps(p: PlayerPose, o: ObstaclePose, spec: ObstacleSpec): [number, number, number] {
  const xo = overlap(
    p.x - player.halfWidth,
    p.x + player.halfWidth,
    o.x - spec.halfWidth,
    o.x + spec.halfWidth,
  );
  const zo = overlap(-player.halfLength, player.halfLength, o.d, o.d + spec.length);
  const yo = overlap(p.y, p.y + p.height, spec.y0, solidTop(spec));
  return [xo, zo, yo];
}

export function touches(p: PlayerPose, o: ObstaclePose, spec: ObstacleSpec): boolean {
  const [xo, zo, yo] = overlaps(p, o, spec);
  return xo > 0 && zo > 0 && yo > 0;
}

export function classifyHit(
  now: PlayerPose,
  prev: PlayerPose,
  obstacle: ObstaclePose,
  prevObstacle: ObstaclePose,
  spec: ObstacleSpec,
): HitKind | null {
  const [xo, zo, yo] = overlaps(now, obstacle, spec);
  if (xo <= 0 || zo <= 0 || yo <= 0) return null;
  const [pxo, pzo, pyo] = overlaps(prev, prevObstacle, spec);
  if (pzo <= 0) return xo < collision.grazeOverlap ? 'graze' : 'front';
  if (pxo <= 0) return 'side';
  if (pyo <= 0) return 'vertical';
  return 'front';
}

export function isLightHit(kind: HitKind): boolean {
  return kind === 'side' || kind === 'graze';
}
