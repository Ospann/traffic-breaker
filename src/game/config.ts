export type Orientation = 'portrait' | 'landscape';

const orientation: Orientation = 'portrait';
const baseSize = { width: 720, height: 1280 };

export const gameConfig = {
  id: 'game-template',
  orientation,
  width: orientation === 'portrait' ? baseSize.width : baseSize.height,
  height: orientation === 'portrait' ? baseSize.height : baseSize.width,
  backgroundColor: '#1d1f2b',
  physics: 'none' as 'none' | 'arcade' | 'matter',
  levelDurationSec: 20,
  ads: {
    interstitialCooldownSec: 60,
  },
  save: {
    key: 'save',
    debounceMs: 500,
  },
} as const;
