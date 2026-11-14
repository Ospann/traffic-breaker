import { track as trackBalance } from '../balance';
import type { Pattern } from '../patterns/pattern-schema';
import { supportAt, type Support } from '../sim/collision';
import { laneX } from '../sim/player-motion';
import { obstacleSpecs, type ObstacleSpec, type ObstacleType } from './entities';
import { PickupField } from './pickups';
import { Pool } from './pool';

export interface TrackEntity {
  readonly index: number;
  type: ObstacleType;
  spec: ObstacleSpec;
  lane: number;
  x: number;
  patternD: number;
  d: number;
  prevD: number;
  ignored: boolean;
  touched: boolean;
  cleared: boolean;
  active: boolean;
}

export interface PatternSource {
  next(elapsedSec: number): Pattern;
  reset(): void;
}

export interface TrackListener {
  spawn(entity: TrackEntity): void;
  despawn(entity: TrackEntity): void;
}

export const TRACK_ENTITY_CAPACITY = 96;
const RUNWAY = 45;

export class Track {
  readonly active: TrackEntity[] = [];
  readonly pickups = new PickupField();
  private readonly pool: Pool<TrackEntity>;
  private cursor = RUNWAY;
  private readonly support: Support = { height: 0, ramp: false };
  listener: TrackListener | null = null;

  constructor(private readonly source: PatternSource) {
    this.pool = new Pool<TrackEntity>(
      'track-entities',
      (index) => ({
        index,
        type: 'cone',
        spec: obstacleSpecs.cone,
        lane: 0,
        x: 0,
        patternD: 0,
        d: 0,
        prevD: 0,
        ignored: false,
        touched: false,
        cleared: false,
        active: false,
      }),
      TRACK_ENTITY_CAPACITY,
    );
  }

  reset(seed = 1): void {
    for (const entity of this.active) this.release(entity);
    this.active.length = 0;
    this.cursor = RUNWAY;
    this.source.reset();
    this.pickups.reset(seed);
  }

  clearNear(maxD: number): void {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const entity = this.active[i];
      if (entity && entity.d < maxD) {
        this.release(entity);
        this.active.splice(i, 1);
      }
    }
  }

  clearAhead(fromD: number): void {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const entity = this.active[i];
      if (entity && entity.d > fromD) {
        this.release(entity);
        this.active.splice(i, 1);
      }
    }
    this.cursor = Math.max(fromD, this.cursor);
  }

  update(dt: number, speed: number, elapsedSec = 0): void {
    const travelled = speed * dt;
    this.cursor -= travelled;
    this.pickups.update(travelled);
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const entity = this.active[i];
      if (!entity) continue;
      entity.prevD = entity.d;
      entity.patternD -= travelled;
      entity.d = realDistance(entity, speed);
      if (entity.d + entity.spec.length < -trackBalance.despawnBehind) {
        this.release(entity);
        this.active.splice(i, 1);
      }
    }
    while (this.cursor < trackBalance.spawnAheadDistance) {
      const pattern = this.source.next(elapsedSec);
      this.spawnPattern(pattern, this.cursor, speed);
      this.pickups.spawnPattern(pattern, this.cursor);
      this.cursor += pattern.length;
    }
  }

  supportHeight(px: number, py: number): number {
    return supportAt(this.active, px, py, this.support).height;
  }

  supportAt(px: number, py: number): Support {
    return supportAt(this.active, px, py, this.support);
  }

  private spawnPattern(pattern: Pattern, start: number, speed: number): void {
    for (const item of pattern.obstacles) {
      const entity = this.pool.acquire();
      if (!entity) return;
      entity.type = item.type;
      entity.spec = obstacleSpecs[item.type];
      entity.lane = item.lane;
      entity.x = laneX(item.lane) + (item.offsetX ?? 0);
      entity.patternD = start + item.z;
      entity.d = realDistance(entity, speed);
      entity.prevD = entity.d;
      entity.ignored = false;
      entity.touched = false;
      entity.cleared = false;
      entity.active = true;
      this.active.push(entity);
      this.listener?.spawn(entity);
    }
  }

  private release(entity: TrackEntity): void {
    entity.active = false;
    this.listener?.despawn(entity);
    this.pool.release(entity);
  }
}

function realDistance(entity: TrackEntity, speed: number): number {
  const approach = entity.spec.approachSpeed;
  if (approach <= 0 || speed <= 0.01) return approach <= 0 ? entity.patternD : entity.d;
  return entity.patternD * (1 + approach / speed);
}
