import type Phaser from 'phaser';
import { AdsManager } from '@core/ads';
import { MuteController } from '@core/audio';
import { GameplayTracker } from '@core/gameplay';
import { installInputGuards } from '@core/input';
import { watchPause } from '@core/pause';
import { createPlatform, LocalStorageStore } from '@core/platform';
import { flushOnHide, SaveManager } from '@core/save';
import { gameConfig } from './game/config';
import { createGame } from './game/create-game';
import { saveSchema } from './game/save';
import { pauseGame } from './game/scenes/pause';
import { provideServices } from './game/services';
import { createI18n } from './i18n';
import './style.css';

async function bootstrap(): Promise<void> {
  const root = document.getElementById('game');
  if (!root) throw new Error('#game container is missing');

  installInputGuards(document.body);

  const platform = await createPlatform();
  const gameplay = new GameplayTracker(platform);
  const ads = new AdsManager(platform, gameplay, {
    interstitialCooldownSec: gameConfig.ads.interstitialCooldownSec,
  });
  const save = new SaveManager({
    key: `${gameConfig.id}:${gameConfig.save.key}`,
    schema: saveSchema,
    storage: platform.storage,
    fallback: new LocalStorageStore(),
    debounceMs: gameConfig.save.debounceMs,
  });
  const i18n = createI18n();

  let game: Phaser.Game | null = null;
  const mute = new MuteController((muted) => {
    if (game) game.sound.mute = muted;
  });

  provideServices({ platform, gameplay, ads, save, i18n, mute });

  game = createGame(root);
  game.sound.mute = mute.isMuted;
  const activeGame = game;

  ads.onAdStart(() => mute.set('ad', true));
  ads.onAdEnd(() => mute.set('ad', false));
  platform.onAudioChange((enabled) => mute.set('platform', !enabled));
  platform.onPause(() => mute.set('platform-pause', true));
  platform.onResume(() => mute.set('platform-pause', false));
  flushOnHide(() => save.flush());
  watchPause({
    platform,
    isAdActive: () => ads.isBusy,
    onPause: () => pauseGame(activeGame),
  });

  if (import.meta.env.DEV) {
    Object.assign(window, { __game: game, __platform: platform });
  }
}

bootstrap().catch((error: unknown) => {
  console.error('[bootstrap] failed', error);
});
