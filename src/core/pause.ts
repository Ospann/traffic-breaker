import type { Unsubscribe } from './events';
import type { Platform } from './platform/types';

export interface PauseWatcherOptions {
  platform: Pick<Platform, 'onPause' | 'isAdPlaying'>;
  onPause: (source: 'platform' | 'visibility') => void;
  isAdActive?: () => boolean;
}

export function watchPause(options: PauseWatcherOptions): Unsubscribe {
  const adActive = (): boolean => options.platform.isAdPlaying || (options.isAdActive?.() ?? false);

  const offPlatform = options.platform.onPause(() => {
    if (!adActive()) options.onPause('platform');
  });

  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden' && !adActive()) options.onPause('visibility');
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    offPlatform();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
