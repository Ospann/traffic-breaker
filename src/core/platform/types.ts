import type { Unsubscribe } from '../events';

export type PlatformKind = 'mock' | 'bridge';

export interface PlatformStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface LevelInfo {
  world?: string;
  level?: string;
}

export interface Platform {
  readonly kind: PlatformKind;
  readonly storage: PlatformStorage;
  readonly isAdPlaying: boolean;
  init(): Promise<void>;
  gameReady(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  levelStart(info?: LevelInfo): void;
  levelComplete(info?: LevelInfo): void;
  levelFail(info?: LevelInfo): void;
  showInterstitial(): Promise<void>;
  showRewarded(): Promise<boolean>;
  getLanguage(): string;
  isAudioEnabled(): boolean;
  onPause(listener: () => void): Unsubscribe;
  onResume(listener: () => void): Unsubscribe;
  onAudioChange(listener: (enabled: boolean) => void): Unsubscribe;
}
