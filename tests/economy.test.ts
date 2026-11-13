import { describe, expect, it } from 'vitest';
import {
  MULTIPLIER_MAX,
  SHIELD_MAX_STOCK,
  SHIELD_PRICE,
  UPGRADE_MAX_LEVEL,
  upgradePrices,
} from '../src/game/progression/catalog';
import {
  applyRunResult,
  buyShield,
  buySkin,
  buyUpgrade,
  grantShield,
  selectSkin,
  upgradePrice,
} from '../src/game/progression/economy';
import type { RunMetrics } from '../src/game/progression/missions';
import { defaultSave } from '../src/game/save';

const noMetrics: RunMetrics = {
  coins: 0,
  distance: 0,
  score: 0,
  jumps: 0,
  barriersJumped: 0,
  ducksUnder: 0,
  dashes: 0,
  roofs: 0,
  rampLaunches: 0,
  bonuses: 0,
};

describe('economy', () => {
  it('upgrade prices grow and stop at max level', () => {
    for (let level = 1; level < UPGRADE_MAX_LEVEL; level += 1) {
      expect(upgradePrice(level)).toBeGreaterThan(upgradePrice(level - 1) ?? 0);
    }
    expect(upgradePrice(UPGRADE_MAX_LEVEL)).toBeNull();
  });

  it('buys an upgrade only with enough coins', () => {
    const save = defaultSave();
    save.coins = (upgradePrices[0] ?? 0) - 1;
    expect(buyUpgrade(save, 'magnet')).toBe('insufficient');
    expect(save.upgrades.magnet).toBe(0);
    save.coins += 1;
    expect(buyUpgrade(save, 'magnet')).toBe('ok');
    expect(save.upgrades.magnet).toBe(1);
    expect(save.coins).toBe(0);
  });

  it('cannot upgrade past the max level', () => {
    const save = defaultSave();
    save.coins = 1_000_000;
    for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) expect(buyUpgrade(save, 'thrust')).toBe('ok');
    const coins = save.coins;
    expect(buyUpgrade(save, 'thrust')).toBe('maxed');
    expect(save.coins).toBe(coins);
  });

  it('buys, equips and refuses locked skins', () => {
    const save = defaultSave();
    expect(selectSkin(save, 'neon.magenta')).toBe('locked');
    save.coins = 1000;
    expect(buySkin(save, 'neon.magenta')).toBe('ok');
    expect(save.skins.neon).toBe('neon.magenta');
    expect(save.coins).toBe(700);
    expect(buySkin(save, 'neon.magenta')).toBe('owned');
    expect(selectSkin(save, 'neon.cyan')).toBe('ok');
    expect(save.skins.neon).toBe('neon.cyan');
    expect(buySkin(save, 'nope')).toBe('unknown');
  });

  it('shields are bought up to the stock limit and granted by ads', () => {
    const save = defaultSave();
    save.coins = SHIELD_PRICE * (SHIELD_MAX_STOCK + 2);
    for (let i = 0; i < SHIELD_MAX_STOCK; i += 1) expect(buyShield(save)).toBe('ok');
    expect(buyShield(save)).toBe('maxed');
    expect(grantShield(save)).toBe(false);
    expect(save.shields).toBe(SHIELD_MAX_STOCK);
  });

  it('applies a run: coins, best score, shields left', () => {
    const save = defaultSave();
    save.coins = 50;
    save.shields = 3;
    const summary = applyRunResult(save, {
      score: 1234,
      coins: 40,
      shieldsLeft: 2,
      metrics: noMetrics,
    });
    expect(save.coins).toBe(90);
    expect(save.bestScore).toBe(1234);
    expect(save.shields).toBe(2);
    expect(save.levelsCompleted).toBe(1);
    expect(summary.newBest).toBe(true);
    expect(
      applyRunResult(save, { score: 10, coins: 0, shieldsLeft: 2, metrics: noMetrics }).newBest,
    ).toBe(false);
  });

  it('completing a mission set raises the multiplier up to the cap', () => {
    const save = defaultSave();
    save.multiplier = MULTIPLIER_MAX - 1;
    const n = 1_000_000;
    const huge: RunMetrics = {
      coins: n,
      distance: n,
      score: n,
      jumps: n,
      barriersJumped: n,
      ducksUnder: n,
      dashes: n,
      roofs: n,
      rampLaunches: n,
      bonuses: n,
    };
    const first = applyRunResult(save, { score: 1, coins: 0, shieldsLeft: 0, metrics: huge });
    expect(first.multiplierUp).toBe(true);
    expect(save.multiplier).toBe(MULTIPLIER_MAX);
    expect(save.missions.set).toBe(1);
    const second = applyRunResult(save, { score: 1, coins: 0, shieldsLeft: 0, metrics: huge });
    expect(second.multiplierUp).toBe(false);
    expect(save.multiplier).toBe(MULTIPLIER_MAX);
  });
});
