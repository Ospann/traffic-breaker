import { Emitter, type Unsubscribe } from '../events';
import type { GameplayTracker } from '../gameplay';
import type { Platform } from '../platform/types';

export type AdKind = 'interstitial' | 'rewarded';

type AdsEvents = { start: AdKind; end: AdKind };

export interface AdsManagerOptions {
  interstitialCooldownSec?: number;
  now?: () => number;
}

export class AdsManager {
  private readonly events = new Emitter<AdsEvents>();
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private lastInterstitialAt: number | null = null;
  private levelCompleted = false;
  private busy = false;

  constructor(
    private readonly platform: Pick<Platform, 'showInterstitial' | 'showRewarded'>,
    private readonly gameplay: Pick<GameplayTracker, 'isActive' | 'start' | 'stop'>,
    options: AdsManagerOptions = {},
  ) {
    this.cooldownMs = (options.interstitialCooldownSec ?? 60) * 1000;
    this.now = options.now ?? (() => Date.now());
  }

  get isBusy(): boolean {
    return this.busy;
  }

  markLevelCompleted(): void {
    this.levelCompleted = true;
  }

  canShowInterstitial(): boolean {
    if (this.busy || !this.levelCompleted) return false;
    if (this.lastInterstitialAt === null) return true;
    return this.now() - this.lastInterstitialAt >= this.cooldownMs;
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.canShowInterstitial()) return false;
    this.lastInterstitialAt = this.now();
    await this.run('interstitial', () => this.platform.showInterstitial());
    return true;
  }

  async showRewarded(): Promise<boolean> {
    if (this.busy) return false;
    return this.run('rewarded', () => this.platform.showRewarded());
  }

  onAdStart(listener: (kind: AdKind) => void): Unsubscribe {
    return this.events.on('start', listener);
  }

  onAdEnd(listener: (kind: AdKind) => void): Unsubscribe {
    return this.events.on('end', listener);
  }

  private async run<R>(kind: AdKind, show: () => Promise<R>): Promise<R | false> {
    this.busy = true;
    const resumeGameplay = this.gameplay.isActive;
    if (resumeGameplay) this.gameplay.stop();
    this.events.emit('start', kind);
    try {
      return await show();
    } catch (error) {
      console.warn(`[ads] ${kind} failed`, error);
      return false;
    } finally {
      this.busy = false;
      this.events.emit('end', kind);
      if (resumeGameplay) this.gameplay.start();
    }
  }
}
