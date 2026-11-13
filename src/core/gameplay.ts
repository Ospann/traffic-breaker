import type { Platform } from './platform/types';

export class GameplayTracker {
  private active = false;

  constructor(private readonly platform: Pick<Platform, 'gameplayStart' | 'gameplayStop'>) {}

  get isActive(): boolean {
    return this.active;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.platform.gameplayStart();
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.platform.gameplayStop();
  }
}
