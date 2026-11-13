import { collision, player } from '../balance';
import { surfaceHeight, type ObstacleSpec } from '../world/entities';

export type HitKind = 'front' | 'side' | 'graze' | 'vertical';

export interface PlayerPose {
  x: number;
  y: number;
  height: number;
  frontLift?: number;
}

export interface ObstaclePose {
  x: number;
  d: number;
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function solidTop(spec: ObstacleSpec, d: number): number {
  if (!spec.roof) return spec.y1;
  return surfaceHeight(spec, -d) - player.roofStepTolerance;
}

function overlaps(p: PlayerPose, o: ObstaclePose, spec: ObstacleSpec): [number, number, number] {
  const xo = overlap(
    p.x - player.halfWidth,
    p.x + player.halfWidth,
    o.x - spec.halfWidth,
    o.x + spec.halfWidth,
  );
  const zo = overlap(-player.halfLength, player.halfLength, o.d, o.d + spec.length);
  const lift = spec.roof && o.d > 0 ? (p.frontLift ?? 0) : 0;
  const yo = overlap(p.y + lift, p.y + p.height, spec.y0, solidTop(spec, o.d));
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

export interface SurfaceSource {
  x: number;
  d: number;
  spec: ObstacleSpec;
}

export interface Support {
  height: number;
  ramp: boolean;
}

export function supportAt(
  items: Iterable<SurfaceSource>,
  px: number,
  py: number,
  out: Support,
): Support {
  out.height = 0;
  out.ramp = false;
  for (const item of items) {
    const spec = item.spec;
    if (!spec.roof) continue;
    if (Math.abs(px - item.x) > spec.halfWidth) continue;
    const overhang = spec.slope ? 0 : player.roofOverhang;
    if (item.d > overhang || item.d + spec.length < -overhang) continue;
    const surface = surfaceHeight(spec, -item.d);
    if (py < surface - player.roofStepTolerance) continue;
    if (surface > out.height || (surface === out.height && spec.slope)) {
      out.height = surface;
      out.ramp = spec.slope && -item.d <= spec.length;
    }
  }
  return out;
}

export function overlapsFootprint(p: PlayerPose, o: ObstaclePose, spec: ObstacleSpec): boolean {
  const [xo, zo] = overlaps(p, o, spec);
  return xo > 0 && zo > 0;
}
