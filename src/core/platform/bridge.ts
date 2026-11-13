import bridge, {
  EVENT_NAME,
  INTERSTITIAL_STATE,
  PLATFORM_MESSAGE,
  REWARDED_STATE,
  type InterstitialState,
  type PlatformMessage,
  type RewardedState,
} from '@playgama/bridge';
import { Emitter, type Unsubscribe } from '../events';
import { browserLanguage } from './browser-language';
import type { LevelInfo, Platform, PlatformStorage } from './types';

type BridgeEvents = { pause: undefined; resume: undefined; audio: boolean };

class BridgeStorage implements PlatformStorage {
  async get(key: string): Promise<string | null> {
    const value = await bridge.storage.get(key, false);
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  async set(key: string, value: string): Promise<void> {
    await bridge.storage.set(key, value);
  }
}

export interface BridgePlatformOptions {
  interstitialPlacement?: string;
  rewardedPlacement?: string;
}

export class BridgePlatform implements Platform {
  readonly kind = 'bridge' as const;
  readonly storage: PlatformStorage = new BridgeStorage();
  private readonly events = new Emitter<BridgeEvents>();
  private adPlaying = false;
  private initialized = false;

  constructor(private readonly options: BridgePlatformOptions = {}) {}

  get isAdPlaying(): boolean {
    return this.adPlaying;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await bridge.initialize();
    this.initialized = true;

    bridge.platform.on(EVENT_NAME.PAUSE_STATE_CHANGED, (isPaused: boolean) => {
      this.events.emit(isPaused ? 'pause' : 'resume', undefined);
    });
    bridge.platform.on(EVENT_NAME.AUDIO_STATE_CHANGED, (isEnabled: boolean) => {
      this.events.emit('audio', isEnabled);
    });
  }

  gameReady(): void {
    this.send(PLATFORM_MESSAGE.GAME_READY);
  }

  gameplayStart(): void {
    this.send(PLATFORM_MESSAGE.GAMEPLAY_STARTED);
  }

  gameplayStop(): void {
    this.send(PLATFORM_MESSAGE.GAMEPLAY_STOPPED);
  }

  levelStart(info?: LevelInfo): void {
    this.send(PLATFORM_MESSAGE.LEVEL_STARTED, info);
  }

  levelComplete(info?: LevelInfo): void {
    this.send(PLATFORM_MESSAGE.LEVEL_COMPLETED, info);
  }

  levelFail(info?: LevelInfo): void {
    this.send(PLATFORM_MESSAGE.LEVEL_FAILED, info);
  }

  showInterstitial(): Promise<void> {
    if (!bridge.advertisement.isInterstitialSupported) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const onState = (state: InterstitialState): void => {
        if (state === INTERSTITIAL_STATE.OPENED) {
          this.adPlaying = true;
          return;
        }
        if (state === INTERSTITIAL_STATE.CLOSED || state === INTERSTITIAL_STATE.FAILED) {
          bridge.advertisement.off(EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
          this.adPlaying = false;
          resolve();
        }
      };
      bridge.advertisement.on(EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
      bridge.advertisement.showInterstitial(this.options.interstitialPlacement ?? null);
    });
  }

  showRewarded(): Promise<boolean> {
    if (!bridge.advertisement.isRewardedSupported) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      let rewarded = false;
      const onState = (state: RewardedState): void => {
        if (state === REWARDED_STATE.OPENED) {
          this.adPlaying = true;
          return;
        }
        if (state === REWARDED_STATE.REWARDED) {
          rewarded = true;
          return;
        }
        if (state === REWARDED_STATE.CLOSED || state === REWARDED_STATE.FAILED) {
          bridge.advertisement.off(EVENT_NAME.REWARDED_STATE_CHANGED, onState);
          this.adPlaying = false;
          resolve(rewarded);
        }
      };
      bridge.advertisement.on(EVENT_NAME.REWARDED_STATE_CHANGED, onState);
      bridge.advertisement.showRewarded(this.options.rewardedPlacement ?? null);
    });
  }

  getLanguage(): string {
    return bridge.platform.language || browserLanguage();
  }

  isAudioEnabled(): boolean {
    return bridge.platform.isAudioEnabled;
  }

  onPause(listener: () => void): Unsubscribe {
    return this.events.on('pause', listener);
  }

  onResume(listener: () => void): Unsubscribe {
    return this.events.on('resume', listener);
  }

  onAudioChange(listener: (enabled: boolean) => void): Unsubscribe {
    return this.events.on('audio', listener);
  }

  private send(message: PlatformMessage, info?: LevelInfo): void {
    bridge.platform.sendMessage(message, info ? { ...info } : null).catch((error: unknown) => {
      console.warn(`[platform:bridge] sendMessage(${message}) failed`, error);
    });
  }
}
