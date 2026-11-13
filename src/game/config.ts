export const gameConfig = {
  id: 'traffic-breaker',
  width: 720,
  height: 1280,
  maxAspect: 21 / 9,
  maxPixelRatio: 2,
  backgroundColor: '#090414',
  ads: {
    interstitialCooldownSec: 60,
  },
  save: {
    key: 'save',
    debounceMs: 500,
  },
} as const;
