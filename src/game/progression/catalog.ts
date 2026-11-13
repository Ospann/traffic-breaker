import type { BonusType } from '../balance';

export type UpgradeKind = BonusType | 'thrust';

export const upgradeKinds: readonly UpgradeKind[] = [
  'thrust',
  'fullTank',
  'magnet',
  'double',
  'superJump',
];

export const UPGRADE_MAX_LEVEL = 5;
export const upgradePrices: readonly number[] = [200, 500, 1000, 2000, 4000];

export type SkinCategory = 'neon' | 'kit' | 'flame';

export const skinCategories: readonly SkinCategory[] = ['neon', 'kit', 'flame'];

export interface SkinItem {
  id: string;
  category: SkinCategory;
  price: number;
  color: number;
}

export const skins: readonly SkinItem[] = [
  { id: 'neon.cyan', category: 'neon', price: 0, color: 0x22e6ff },
  { id: 'neon.magenta', category: 'neon', price: 300, color: 0xff2bd6 },
  { id: 'neon.lime', category: 'neon', price: 300, color: 0x8dff3a },
  { id: 'neon.amber', category: 'neon', price: 500, color: 0xffb020 },
  { id: 'neon.red', category: 'neon', price: 500, color: 0xff2244 },
  { id: 'neon.white', category: 'neon', price: 800, color: 0xf2f4ff },
  { id: 'kit.stock', category: 'kit', price: 0, color: 0x3d63c9 },
  { id: 'kit.aero', category: 'kit', price: 600, color: 0x3d63c9 },
  { id: 'kit.blade', category: 'kit', price: 900, color: 0x3d63c9 },
  { id: 'kit.rally', category: 'kit', price: 1200, color: 0x3d63c9 },
  { id: 'flame.orange', category: 'flame', price: 0, color: 0xff6a1a },
  { id: 'flame.blue', category: 'flame', price: 300, color: 0x2a8bff },
  { id: 'flame.green', category: 'flame', price: 400, color: 0x6dff4a },
  { id: 'flame.pink', category: 'flame', price: 400, color: 0xff4fd8 },
  { id: 'flame.white', category: 'flame', price: 700, color: 0xf6f0ff },
];

export const defaultSkins: Readonly<Record<SkinCategory, string>> = {
  neon: 'neon.cyan',
  kit: 'kit.stock',
  flame: 'flame.orange',
};

export function findSkin(id: string): SkinItem | undefined {
  return skins.find((item) => item.id === id);
}

export const SHIELD_PRICE = 350;
export const SHIELD_MAX_STOCK = 9;
export const MULTIPLIER_MAX = 30;
