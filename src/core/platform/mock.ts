import { Emitter, type Unsubscribe } from '../events';
import { browserLanguage } from './browser-language';
import { LocalStorageStore } from './local-storage-store';
import type { LevelInfo, Platform } from './types';

type MockEvents = { pause: undefined; resume: undefined; audio: boolean };

export interface MockPlatformOptions {
  adDurationMs?: number;
  log?: boolean;
}

export class MockPlatform implements Platform {
  readonly kind = 'mock' as const;
  readonly storage = new LocalStorageStore('mock:');
  private readonly events = new Emitter<MockEvents>();
  private readonly adDurationMs: number;
  private readonly log: boolean;
  private adPlaying = false;

  constructor(options: MockPlatformOptions = {}) {
    this.adDurationMs = options.adDurationMs ?? 2500;
    this.log = options.log ?? true;
  }

  get isAdPlaying(): boolean {
    return this.adPlaying;
  }

  async init(): Promise<void> {
    this.trace('init');
  }

  gameReady(): void {
    this.trace('gameReady');
  }

  gameplayStart(): void {
    this.trace('gameplayStart');
  }

  gameplayStop(): void {
    this.trace('gameplayStop');
  }

  levelStart(info?: LevelInfo): void {
    this.trace('levelStart', info);
  }

  levelComplete(info?: LevelInfo): void {
    this.trace('levelComplete', info);
  }

  levelFail(info?: LevelInfo): void {
    this.trace('levelFail', info);
  }

  async showInterstitial(): Promise<void> {
    await this.showOverlay('interstitial');
  }

  async showRewarded(): Promise<boolean> {
    return this.showOverlay('rewarded');
  }

  getLanguage(): string {
    const forced = new URLSearchParams(window.location.search).get('lang');
    return forced ?? browserLanguage();
  }

  isAudioEnabled(): boolean {
    return true;
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

  simulatePause(): void {
    this.events.emit('pause', undefined);
  }

  simulateResume(): void {
    this.events.emit('resume', undefined);
  }

  private showOverlay(type: 'interstitial' | 'rewarded'): Promise<boolean> {
    this.trace(`show ${type}`);
    this.adPlaying = true;
    this.events.emit('pause', undefined);

    return new Promise<boolean>((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'mock-ad';
      overlay.setAttribute('role', 'dialog');

      const title = document.createElement('div');
      title.className = 'mock-ad__title';
      title.textContent = type === 'rewarded' ? 'Rewarded ad (mock)' : 'Interstitial ad (mock)';

      const timer = document.createElement('div');
      timer.className = 'mock-ad__timer';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mock-ad__button';

      overlay.append(title, timer, button);
      document.body.append(overlay);

      const startedAt = performance.now();
      let completed = false;

      const render = (): void => {
        const left = Math.max(0, this.adDurationMs - (performance.now() - startedAt));
        completed = left === 0;
        timer.textContent = completed ? 'Done' : `${Math.ceil(left / 1000)}s`;
        if (type === 'rewarded') {
          button.textContent = completed ? 'Close (reward granted)' : 'Skip (no reward)';
        } else {
          button.textContent = completed ? 'Close' : 'Skip';
        }
      };

      render();
      const interval = window.setInterval(render, 100);

      button.addEventListener(
        'click',
        (event) => {
          event.stopPropagation();
          window.clearInterval(interval);
          render();
          overlay.remove();
          this.adPlaying = false;
          const rewarded = type === 'rewarded' && completed;
          this.trace(`${type} closed`, { completed, rewarded });
          this.events.emit('resume', undefined);
          resolve(rewarded);
        },
        { once: true },
      );
    });
  }

  private trace(message: string, data?: unknown): void {
    if (!this.log) return;
    if (data === undefined) console.info(`[platform:mock] ${message}`);
    else console.info(`[platform:mock] ${message}`, data);
  }
}
