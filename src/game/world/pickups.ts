import {
  airTrail,
  bonuses,
  bonusTypes,
  LANES,
  track as trackBalance,
  type BonusType,
} from '../balance';
import { patternCoinPoints } from '../patterns/coins';
import type { Pattern } from '../patterns/pattern-schema';
import { laneX } from '../sim/player-motion';
import { Pool } from './pool';
import { mulberry32, type Random } from './random';

export interface Coin {
  x: number;
  y: number;
  d: number;
  lane: number;
  active: boolean;
  pulled: boolean;
}

export interface Bonus {
  type: BonusType;
  x: number;
  y: number;
  d: number;
  active: boolean;
}

export const COIN_CAPACITY = 320;
export const BONUS_CAPACITY = 8;

export class PickupField {
  readonly coins: Coin[] = [];
  readonly bonuses: Bonus[] = [];
  private readonly coinPool = new Pool<Coin>(
    'coins',
    () => ({ x: 0, y: 0, d: 0, lane: 0, active: false, pulled: false }),
    COIN_CAPACITY,
  );
  private readonly bonusPool = new Pool<Bonus>(
    'bonuses',
    () => ({ type: 'magnet', x: 0, y: 0, d: 0, active: false }),
    BONUS_CAPACITY,
  );
  private random: Random = mulberry32(1);
  private nextBonusAt: number = bonuses.firstAtMeters;
  private spawnedMeters = 0;
  bonusesEnabled = true;

  reset(seed: number): void {
    for (const coin of this.coins) this.releaseCoin(coin);
    for (const bonus of this.bonuses) this.releaseBonus(bonus);
    this.coins.length = 0;
    this.bonuses.length = 0;
    this.random = mulberry32(seed);
    this.nextBonusAt = bonuses.firstAtMeters;
    this.spawnedMeters = 0;
  }

  update(travelled: number): void {
    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      const coin = this.coins[i];
      if (!coin) continue;
      if (!coin.pulled) coin.d -= travelled;
      if (coin.d < -trackBalance.despawnBehind) this.removeCoinAt(i);
    }
    for (let i = this.bonuses.length - 1; i >= 0; i -= 1) {
      const bonus = this.bonuses[i];
      if (!bonus) continue;
      bonus.d -= travelled;
      if (bonus.d < -trackBalance.despawnBehind) this.removeBonusAt(i);
    }
  }

  spawnPattern(pattern: Pattern, start: number): void {
    const points = patternCoinPoints(pattern);
    let bonusIndex = -1;
    this.spawnedMeters += pattern.length;
    if (this.bonusesEnabled && points.length > 0 && this.spawnedMeters >= this.nextBonusAt) {
      bonusIndex = Math.floor(this.random() * points.length);
      const [min, max] = bonuses.spacingMeters;
      this.nextBonusAt = this.spawnedMeters + min + this.random() * (max - min);
    }
    points.forEach((point, index) => {
      const x = laneX(point.lane);
      const d = start + point.z;
      if (index === bonusIndex) this.addBonus(this.pickBonusType(), x, point.y, d);
      else this.addCoin(point.lane, x, point.y, d);
    });
  }

  spawnAirTrail(fromD: number, length: number, startLane: number): void {
    let lane = startLane;
    let segmentLeft = airTrail.segmentMeters;
    for (let d = fromD + airTrail.leadMeters; d < fromD + length; d += airTrail.spacing) {
      segmentLeft -= airTrail.spacing;
      if (segmentLeft <= 0) {
        segmentLeft = airTrail.segmentMeters;
        const step = this.random() < 0.5 ? -1 : 1;
        lane = Math.min(Math.max(lane + step, 0), LANES - 1);
      }
      this.addCoin(lane, laneX(lane), airTrail.y, d);
    }
  }

  removeCoinAt(index: number): void {
    const coin = this.coins[index];
    if (!coin) return;
    const last = this.coins.pop();
    if (last && last !== coin) this.coins[index] = last;
    this.releaseCoin(coin);
  }

  removeBonusAt(index: number): void {
    const bonus = this.bonuses[index];
    if (!bonus) return;
    this.bonuses.splice(index, 1);
    this.releaseBonus(bonus);
  }

  private addCoin(lane: number, x: number, y: number, d: number): void {
    const coin = this.coinPool.acquire();
    if (!coin) return;
    coin.lane = lane;
    coin.x = x;
    coin.y = y;
    coin.d = d;
    coin.active = true;
    coin.pulled = false;
    this.coins.push(coin);
  }

  private addBonus(type: BonusType, x: number, y: number, d: number): void {
    const bonus = this.bonusPool.acquire();
    if (!bonus) return;
    bonus.type = type;
    bonus.x = x;
    bonus.y = y;
    bonus.d = d;
    bonus.active = true;
    this.bonuses.push(bonus);
  }

  private pickBonusType(): BonusType {
    const total = bonusTypes.reduce((sum, type) => sum + bonuses.weights[type], 0);
    let roll = this.random() * total;
    for (const type of bonusTypes) {
      roll -= bonuses.weights[type];
      if (roll <= 0) return type;
    }
    return 'magnet';
  }

  private releaseCoin(coin: Coin): void {
    coin.active = false;
    this.coinPool.release(coin);
  }

  private releaseBonus(bonus: Bonus): void {
    bonus.active = false;
    this.bonusPool.release(bonus);
  }
}
