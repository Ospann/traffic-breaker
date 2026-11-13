import type { AdsManager } from '@core/ads';
import type { MuteController } from '@core/audio';
import type { GameplayTracker } from '@core/gameplay';
import type { Platform } from '@core/platform';
import type { SaveManager } from '@core/save';
import type { GameI18n } from '../i18n';
import type { GameSave } from './save';

export interface Services {
  platform: Platform;
  gameplay: GameplayTracker;
  ads: AdsManager;
  save: SaveManager<GameSave>;
  i18n: GameI18n;
  mute: MuteController;
}

let current: Services | null = null;

export function provideServices(value: Services): void {
  current = value;
}

export function services(): Services {
  if (!current) throw new Error('Services are not initialised');
  return current;
}
