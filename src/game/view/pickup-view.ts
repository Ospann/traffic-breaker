import {
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Scene,
} from 'three';
import { buildBonus, buildCoinMesh } from '../art/pickups';
import { bonusTypes, type BonusType } from '../balance';
import { COIN_CAPACITY, type PickupField } from '../world/pickups';

const BONUS_VIEWS_PER_TYPE = 3;

const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const euler = new Euler();
const unit = new Vector3(1, 1, 1);

export class PickupView {
  private readonly coins: InstancedMesh;
  private readonly bonusViews = new Map<BonusType, Group[]>();
  private time = 0;
  private readonly used: Record<BonusType, number> = {
    fullTank: 0,
    magnet: 0,
    double: 0,
    superJump: 0,
  };

  constructor(scene: Scene) {
    this.coins = buildCoinMesh(COIN_CAPACITY);
    scene.add(this.coins);
    for (const type of bonusTypes) {
      const prototype = buildBonus(type);
      const views: Group[] = [];
      for (let i = 0; i < BONUS_VIEWS_PER_TYPE; i += 1) {
        const view = i === 0 ? prototype : prototype.clone();
        view.visible = false;
        scene.add(view);
        views.push(view);
      }
      this.bonusViews.set(type, views);
    }
  }

  update(dt: number, field: PickupField | null): void {
    this.time += dt;
    if (!field) {
      this.coins.count = 0;
      for (const views of this.bonusViews.values()) for (const v of views) v.visible = false;
      return;
    }
    let count = 0;
    for (const coin of field.coins) {
      if (count >= COIN_CAPACITY) break;
      euler.set(0, this.time * 4 + coin.d * 0.15, 0);
      quaternion.setFromEuler(euler);
      position.set(coin.x, coin.y, -coin.d);
      matrix.compose(position, quaternion, unit);
      this.coins.setMatrixAt(count, matrix);
      count += 1;
    }
    this.coins.count = count;
    this.coins.instanceMatrix.needsUpdate = true;

    for (const views of this.bonusViews.values()) for (const v of views) v.visible = false;
    for (const type of bonusTypes) this.used[type] = 0;
    for (const bonus of field.bonuses) {
      const views = this.bonusViews.get(bonus.type);
      const index = this.used[bonus.type];
      const view = views?.[index];
      if (!view) continue;
      this.used[bonus.type] = index + 1;
      view.visible = true;
      view.position.set(bonus.x, bonus.y + 0.15 * Math.sin(this.time * 3 + bonus.d), -bonus.d);
      view.rotation.set(0, this.time * 2, 0);
      const pulse = 1 + 0.08 * Math.sin(this.time * 6);
      view.scale.set(pulse, pulse, pulse);
    }
  }
}
