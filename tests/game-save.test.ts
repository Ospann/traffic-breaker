import { describe, expect, it } from 'vitest';
import { migrate } from '@core/save';
import {
  MULTIPLIER_MAX,
  SHIELD_MAX_STOCK,
  UPGRADE_MAX_LEVEL,
} from '../src/game/progression/catalog';
import { defaultSave, sanitizeSave, saveSchema } from '../src/game/save';

describe('game save', () => {
  it('is version 3', () => {
    expect(saveSchema.version).toBe(3);
  });

  it('migrates a v1 save with highScore', () => {
    const data = migrate({ v: 1, data: { highScore: 77, soundEnabled: false } }, saveSchema);
    expect(data.bestScore).toBe(77);
    expect(data.soundEnabled).toBe(false);
    expect(data.coins).toBe(0);
    expect(data.upgrades).toEqual(defaultSave().upgrades);
  });

  it('migrates a v2 save and keeps progress', () => {
    const data = migrate(
      {
        v: 2,
        data: { bestScore: 900, levelsCompleted: 4, soundEnabled: true, language: 'tr' },
      },
      saveSchema,
    );
    expect(data.bestScore).toBe(900);
    expect(data.levelsCompleted).toBe(4);
    expect(data.language).toBe('tr');
    expect(data.multiplier).toBe(1);
    expect(data.skins.neon).toBe('neon.cyan');
    expect(data.missions.set).toBe(0);
    expect(data.tutorialDone).toBe(true);
  });

  it('fresh players have not seen the tutorial', () => {
    expect(migrate(null, saveSchema).tutorialDone).toBe(false);
    expect(migrate({ v: 2, data: { levelsCompleted: 0 } }, saveSchema).tutorialDone).toBe(false);
  });

  it('sanitizes broken values', () => {
    const data = sanitizeSave({
      bestScore: -5,
      coins: 'lots',
      shields: 99,
      multiplier: 999,
      language: 'de',
      upgrades: { magnet: 42, thrust: -1, bogus: 3 },
      skins: {
        owned: ['neon.magenta', 'fake'],
        neon: 'neon.lime',
        kit: 'kit.aero',
        flame: 'flame.blue',
      },
      missions: { set: 2, progress: [5, 'x'], done: [true, 1, false] },
    });
    expect(data.bestScore).toBe(0);
    expect(data.coins).toBe(0);
    expect(data.shields).toBe(SHIELD_MAX_STOCK);
    expect(data.multiplier).toBe(MULTIPLIER_MAX);
    expect(data.language).toBeNull();
    expect(data.upgrades.magnet).toBe(UPGRADE_MAX_LEVEL);
    expect(data.upgrades.thrust).toBe(0);
    expect(data.skins.owned).toContain('neon.magenta');
    expect(data.skins.owned).not.toContain('fake');
    expect(data.skins.neon).toBe('neon.cyan');
    expect(data.skins.kit).toBe('kit.stock');
    expect(data.missions).toEqual({ set: 2, progress: [5, 0, 0], done: [true, false, false] });
  });

  it('keeps a valid save unchanged', () => {
    const save = defaultSave();
    save.coins = 120;
    save.skins.owned.push('neon.lime');
    save.skins.neon = 'neon.lime';
    expect(sanitizeSave(save)).toEqual(save);
  });
});
