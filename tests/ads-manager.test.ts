import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdsManager } from '@core/ads';
import { GameplayTracker } from '@core/gameplay';

function setup(cooldownSec = 60) {
  let now = 0;
  const calls: string[] = [];
  const platform = {
    gameplayStart: vi.fn<() => void>(() => {
      calls.push('gameplayStart');
    }),
    gameplayStop: vi.fn<() => void>(() => {
      calls.push('gameplayStop');
    }),
    showInterstitial: vi.fn<() => Promise<void>>(async () => {
      calls.push('interstitial');
    }),
    showRewarded: vi.fn<() => Promise<boolean>>(async () => {
      calls.push('rewarded');
      return true;
    }),
  };
  const gameplay = new GameplayTracker(platform);
  const ads = new AdsManager(platform, gameplay, {
    interstitialCooldownSec: cooldownSec,
    now: () => now,
  });
  return {
    ads,
    gameplay,
    platform,
    calls,
    advance: (sec: number) => {
      now += sec * 1000;
    },
  };
}

describe('AdsManager', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('does not show an interstitial before the first completed level', async () => {
    ctx.advance(600);
    expect(await ctx.ads.showInterstitial()).toBe(false);
    expect(ctx.platform.showInterstitial).not.toHaveBeenCalled();
  });

  it('shows the first interstitial right after the first completed level', async () => {
    ctx.ads.markLevelCompleted();
    expect(await ctx.ads.showInterstitial()).toBe(true);
    expect(ctx.platform.showInterstitial).toHaveBeenCalledTimes(1);
  });

  it('shows interstitials no more often than the cooldown', async () => {
    ctx.ads.markLevelCompleted();
    await ctx.ads.showInterstitial();
    ctx.advance(59);
    expect(await ctx.ads.showInterstitial()).toBe(false);
    ctx.advance(1);
    expect(await ctx.ads.showInterstitial()).toBe(true);
    expect(ctx.platform.showInterstitial).toHaveBeenCalledTimes(2);
  });

  it('respects a custom cooldown', async () => {
    const custom = setup(10);
    custom.ads.markLevelCompleted();
    await custom.ads.showInterstitial();
    custom.advance(10);
    expect(await custom.ads.showInterstitial()).toBe(true);
  });

  it('defaults to a 60 second cooldown', async () => {
    const platform = {
      gameplayStart: vi.fn<() => void>(),
      gameplayStop: vi.fn<() => void>(),
      showInterstitial: vi.fn<() => Promise<void>>(async () => {}),
      showRewarded: vi.fn<() => Promise<boolean>>(async () => true),
    };
    let now = 0;
    const ads = new AdsManager(platform, new GameplayTracker(platform), { now: () => now });
    ads.markLevelCompleted();
    await ads.showInterstitial();
    now = 59_999;
    expect(ads.canShowInterstitial()).toBe(false);
    now = 60_000;
    expect(ads.canShowInterstitial()).toBe(true);
  });

  it('does not limit rewarded ads', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(await ctx.ads.showRewarded()).toBe(true);
    }
    expect(ctx.platform.showRewarded).toHaveBeenCalledTimes(5);
  });

  it('rewarded ads do not reset the interstitial cooldown', async () => {
    ctx.ads.markLevelCompleted();
    await ctx.ads.showRewarded();
    expect(ctx.ads.canShowInterstitial()).toBe(true);
  });

  it('stops gameplay for the ad and starts it again afterwards', async () => {
    ctx.gameplay.start();
    ctx.calls.length = 0;
    ctx.ads.markLevelCompleted();
    await ctx.ads.showInterstitial();
    await ctx.ads.showRewarded();
    expect(ctx.calls).toEqual([
      'gameplayStop',
      'interstitial',
      'gameplayStart',
      'gameplayStop',
      'rewarded',
      'gameplayStart',
    ]);
  });

  it('does not start gameplay after an ad if it was not running before', async () => {
    await ctx.ads.showRewarded();
    expect(ctx.platform.gameplayStart).not.toHaveBeenCalled();
    expect(ctx.platform.gameplayStop).not.toHaveBeenCalled();
  });

  it('restores gameplay and reports no reward when the ad throws', async () => {
    ctx.platform.showRewarded.mockRejectedValueOnce(new Error('no fill'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    ctx.gameplay.start();
    expect(await ctx.ads.showRewarded()).toBe(false);
    expect(ctx.gameplay.isActive).toBe(true);
    expect(ctx.ads.isBusy).toBe(false);
  });

  it('emits start and end events around the ad', async () => {
    const events: string[] = [];
    ctx.ads.onAdStart((kind) => events.push(`start:${kind}`));
    ctx.ads.onAdEnd((kind) => events.push(`end:${kind}`));
    await ctx.ads.showRewarded();
    expect(events).toEqual(['start:rewarded', 'end:rewarded']);
  });
});
