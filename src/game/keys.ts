export const SceneKey = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Game: 'Game',
  Pause: 'Pause',
  GameOver: 'GameOver',
} as const;

export type SceneKey = (typeof SceneKey)[keyof typeof SceneKey];

export const AssetKey = {
  Star: 'star',
  Tap: 'tap',
} as const;

export const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
