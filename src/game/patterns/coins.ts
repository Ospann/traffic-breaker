import type { PatternCoins } from './pattern-schema';

export const COIN_DEFAULT_Y = 1;
export const COIN_DEFAULT_SPACING = 3;

export interface CoinPoint {
  lane: number;
  z: number;
  y: number;
}

export function coinPoints(coins: PatternCoins): CoinPoint[] {
  const points: CoinPoint[] = [];
  for (let i = 0; i < coins.count; i += 1) {
    if (coins.kind === 'line') {
      points.push({
        lane: coins.lane,
        z: coins.z + i * (coins.spacing ?? COIN_DEFAULT_SPACING),
        y: coins.y ?? COIN_DEFAULT_Y,
      });
    } else {
      const t = coins.count === 1 ? 0.5 : i / (coins.count - 1);
      points.push({
        lane: coins.lane,
        z: coins.z + t * coins.length,
        y: COIN_DEFAULT_Y + coins.height * 4 * t * (1 - t),
      });
    }
  }
  return points;
}
