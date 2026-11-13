import type { SaveData, SaveSchema } from '@core/save';
import type { Language } from '../i18n';
import {
  defaultSkins,
  findSkin,
  MULTIPLIER_MAX,
  SHIELD_MAX_STOCK,
  skinCategories,
  UPGRADE_MAX_LEVEL,
  upgradeKinds,
  type SkinCategory,
  type UpgradeKind,
} from './progression/catalog';
import { emptyMissionState, MISSIONS_PER_SET, type MissionState } from './progression/missions';

export interface SkinState {
  owned: string[];
  neon: string;
  kit: string;
  flame: string;
}

export interface GameSave extends Record<string, unknown> {
  bestScore: number;
  levelsCompleted: number;
  soundEnabled: boolean;
  language: Language | null;
  coins: number;
  shields: number;
  upgrades: Record<UpgradeKind, number>;
  skins: SkinState;
  missions: MissionState;
  multiplier: number;
  tutorialDone: boolean;
}

function defaultUpgrades(): Record<UpgradeKind, number> {
  return { thrust: 0, fullTank: 0, magnet: 0, double: 0, superJump: 0 };
}

function defaultSkinState(): SkinState {
  return {
    owned: Object.values(defaultSkins),
    neon: defaultSkins.neon,
    kit: defaultSkins.kit,
    flame: defaultSkins.flame,
  };
}

export function defaultSave(): GameSave {
  return {
    bestScore: 0,
    levelsCompleted: 0,
    soundEnabled: true,
    language: null,
    coins: 0,
    shields: 0,
    upgrades: defaultUpgrades(),
    skins: defaultSkinState(),
    missions: emptyMissionState(),
    multiplier: 1,
    tutorialDone: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function sanitizeSkins(raw: unknown): SkinState {
  const base = defaultSkinState();
  if (!isRecord(raw)) return base;
  const owned = new Set(base.owned);
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned) if (typeof id === 'string' && findSkin(id)) owned.add(id);
  }
  const pick = (category: SkinCategory): string => {
    const value = raw[category];
    const item = typeof value === 'string' ? findSkin(value) : undefined;
    return item && item.category === category && owned.has(item.id) ? item.id : base[category];
  };
  const state: SkinState = { owned: [...owned], neon: base.neon, kit: base.kit, flame: base.flame };
  for (const category of skinCategories) state[category] = pick(category);
  return state;
}

function sanitizeMissions(raw: unknown): MissionState {
  if (!isRecord(raw)) return emptyMissionState();
  const set = int(raw.set, 0, 0, 10_000);
  const state = emptyMissionState(set);
  for (let i = 0; i < MISSIONS_PER_SET; i += 1) {
    const progress = Array.isArray(raw.progress) ? raw.progress[i] : undefined;
    const done = Array.isArray(raw.done) ? raw.done[i] : undefined;
    state.progress[i] = int(progress, 0, 0, 1_000_000_000);
    state.done[i] = done === true;
  }
  return state;
}

export function sanitizeSave(data: SaveData): GameSave {
  const base = defaultSave();
  const upgrades = defaultUpgrades();
  const rawUpgrades = isRecord(data.upgrades) ? data.upgrades : {};
  for (const kind of upgradeKinds) upgrades[kind] = int(rawUpgrades[kind], 0, 0, UPGRADE_MAX_LEVEL);
  const language = data.language;
  return {
    bestScore: int(data.bestScore, 0, 0, Number.MAX_SAFE_INTEGER),
    levelsCompleted: int(data.levelsCompleted, 0, 0, Number.MAX_SAFE_INTEGER),
    soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : base.soundEnabled,
    language: language === 'en' || language === 'ru' || language === 'tr' ? language : null,
    coins: int(data.coins, 0, 0, Number.MAX_SAFE_INTEGER),
    shields: int(data.shields, 0, 0, SHIELD_MAX_STOCK),
    upgrades,
    skins: sanitizeSkins(data.skins),
    missions: sanitizeMissions(data.missions),
    multiplier: int(data.multiplier, 1, 1, MULTIPLIER_MAX),
    tutorialDone: data.tutorialDone === true,
  };
}

export const saveSchema: SaveSchema<GameSave> = {
  version: 3,
  defaults: defaultSave,
  migrations: {
    2: (data) => {
      const { highScore, ...rest } = data;
      return { ...rest, bestScore: typeof highScore === 'number' ? highScore : 0 };
    },
    3: (data) => {
      const played = typeof data.levelsCompleted === 'number' ? data.levelsCompleted : 0;
      return sanitizeSave({ ...data, tutorialDone: played > 0 });
    },
  },
};
