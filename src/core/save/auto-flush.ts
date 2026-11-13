import type { Unsubscribe } from '../events';

export function flushOnHide(flush: () => Promise<void>): Unsubscribe {
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const onPageHide = (): void => {
    void flush();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };
}
