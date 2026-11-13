import type { MeshBasicMaterial, Object3D, Scene } from 'three';
import { buildObstacle } from '../art/obstacles';
import { obstacleTypes, type ObstacleType } from '../world/entities';
import { Pool } from '../world/pool';
import type { TrackEntity, TrackListener } from '../world/track';

interface ObstacleView {
  root: Object3D;
  flicker: MeshBasicMaterial | null;
  entity: TrackEntity | null;
  hitTime: number;
}

export const obstaclePoolSizes: Readonly<Record<ObstacleType, number>> = {
  lowBarrier: 10,
  midBarrier: 10,
  highSign: 8,
  truck: 16,
  bus: 8,
  oncoming: 8,
  cone: 16,
  hologram: 8,
  ramp: 8,
};

export class TrackView implements TrackListener {
  private readonly pools = new Map<ObstacleType, Pool<ObstacleView>>();
  private readonly byEntity = new Map<number, ObstacleView>();
  private time = 0;

  constructor(scene: Scene) {
    for (const type of obstacleTypes) {
      const prototype = buildObstacle(type);
      const pool = new Pool<ObstacleView>(
        `view-${type}`,
        () => {
          const root = prototype.root.clone();
          let flicker: MeshBasicMaterial | null = null;
          if (prototype.flicker) {
            flicker = prototype.flicker.clone();
            root.traverse((child) => {
              if ('material' in child && child.material === prototype.flicker) {
                child.material = flicker;
              }
            });
          }
          root.visible = false;
          scene.add(root);
          return { root, flicker, entity: null, hitTime: -1 };
        },
        obstaclePoolSizes[type],
      );
      this.pools.set(type, pool);
    }
  }

  spawn(entity: TrackEntity): void {
    const view = this.pools.get(entity.type)?.acquire();
    if (!view) return;
    view.entity = entity;
    view.hitTime = -1;
    view.root.visible = true;
    view.root.rotation.set(0, 0, 0);
    view.root.position.y = 0;
    view.root.scale.set(1, 1, 1);
    this.byEntity.set(entity.index, view);
    this.place(view);
  }

  despawn(entity: TrackEntity): void {
    const view = this.byEntity.get(entity.index);
    if (!view) return;
    this.byEntity.delete(entity.index);
    view.root.visible = false;
    view.entity = null;
    this.pools.get(entity.type)?.release(view);
  }

  markTouched(entity: TrackEntity): void {
    const view = this.byEntity.get(entity.index);
    if (view) view.hitTime = this.time;
  }

  update(dt: number): void {
    this.time += dt;
    for (const view of this.byEntity.values()) {
      this.place(view);
      const entity = view.entity;
      if (!entity) continue;
      const since = view.hitTime < 0 ? -1 : this.time - view.hitTime;
      if (entity.type === 'cone' && since >= 0) {
        view.root.rotation.x = Math.min(since * 9, 1.4);
        view.root.position.y = Math.max(0, Math.sin(Math.min(since * 6, Math.PI)) * 0.6);
      }
      if (view.flicker) {
        const base = 0.28 + 0.06 * Math.sin(this.time * 5 + entity.index);
        const glitch = since >= 0 && since < 0.6 ? (Math.sin(since * 80) > 0 ? 0.5 : 0.05) : 0;
        view.flicker.opacity = glitch > 0 ? glitch : base;
        view.root.scale.x = since >= 0 && since < 0.6 ? 1 + 0.15 * Math.sin(since * 50) : 1;
      }
    }
  }

  reset(): void {
    for (const view of Array.from(this.byEntity.values())) {
      if (view.entity) this.despawn(view.entity);
    }
  }

  get visibleCount(): number {
    return this.byEntity.size;
  }

  private place(view: ObstacleView): void {
    const entity = view.entity;
    if (!entity) return;
    view.root.position.set(entity.x, view.root.position.y, -(entity.d + entity.spec.length / 2));
  }
}
