import type { GameSave } from '../save';
import {
  findSkin,
  MULTIPLIER_MAX,
  SHIELD_MAX_STOCK,
  SHIELD_PRICE,
  UPGRADE_MAX_LEVEL,
  upgradePrices,
  type UpgradeKind,
} from './catalog';
import { commitRun, type RunMetrics } from './missions';

export type PurchaseResult = 'ok' | 'insufficient' | 'maxed' | 'owned' | 'unknown' | 'locked';

export function upgradePrice(level: number): number | null {
  if (level >= UPGRADE_MAX_LEVEL) return null;
  return upgradePrices[Math.max(0, level)] ?? null;
}

export function buyUpgrade(save: GameSave, kind: UpgradeKind): PurchaseResult {
  const level = save.upgrades[kind];
  const price = upgradePrice(level);
  if (price === null) return 'maxed';
  if (save.coins < price) return 'insufficient';
  save.coins -= price;
  save.upgrades[kind] = level + 1;
  return 'ok';
}

export function buySkin(save: GameSave, id: string): PurchaseResult {
  const item = findSkin(id);
  if (!item) return 'unknown';
  if (save.skins.owned.includes(id)) return 'owned';
  if (save.coins < item.price) return 'insufficient';
  save.coins -= item.price;
  save.skins.owned.push(id);
  save.skins[item.category] = id;
  return 'ok';
}

export function selectSkin(save: GameSave, id: string): PurchaseResult {
  const item = findSkin(id);
  if (!item) return 'unknown';
  if (!save.skins.owned.includes(id)) return 'locked';
  save.skins[item.category] = id;
  return 'ok';
}

export function buyShield(save: GameSave): PurchaseResult {
  if (save.shields >= SHIELD_MAX_STOCK) return 'maxed';
  if (save.coins < SHIELD_PRICE) return 'insufficient';
  save.coins -= SHIELD_PRICE;
  save.shields += 1;
  return 'ok';
}

export function grantShield(save: GameSave): boolean {
  if (save.shields >= SHIELD_MAX_STOCK) return false;
  save.shields += 1;
  return true;
}

export interface RunOutcome {
  score: number;
  coins: number;
  shieldsLeft: number;
  metrics: RunMetrics;
}

export interface RunSummary {
  newBest: boolean;
  completedMissions: number[];
  completedSet: number | null;
  multiplier: number;
  multiplierUp: boolean;
}

export function applyRunResult(save: GameSave, outcome: RunOutcome): RunSummary {
  const previousSet = save.missions.set;
  const newBest = outcome.score > save.bestScore;
  save.bestScore = Math.max(save.bestScore, outcome.score);
  save.levelsCompleted += 1;
  save.coins += outcome.coins;
  save.shields = Math.min(Math.max(outcome.shieldsLeft, 0), SHIELD_MAX_STOCK);
  const commit = commitRun(save.missions, outcome.metrics);
  save.missions = commit.state;
  const multiplierUp = commit.setsCompleted > 0 && save.multiplier < MULTIPLIER_MAX;
  if (multiplierUp) save.multiplier += 1;
  return {
    newBest,
    completedMissions: commit.completedNow,
    completedSet: commit.setsCompleted > 0 ? previousSet : null,
    multiplier: save.multiplier,
    multiplierUp,
  };
}
