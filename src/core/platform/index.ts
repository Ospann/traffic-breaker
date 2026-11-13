import type { Platform, PlatformKind } from './types';

export type { LevelInfo, Platform, PlatformKind, PlatformStorage } from './types';
export { LocalStorageStore } from './local-storage-store';

export const platformKind: PlatformKind =
  import.meta.env.VITE_PLATFORM === 'bridge' ? 'bridge' : 'mock';

export async function createPlatform(): Promise<Platform> {
  if (import.meta.env.VITE_PLATFORM === 'bridge') {
    const { BridgePlatform } = await import('./bridge');
    return new BridgePlatform();
  }
  const { MockPlatform } = await import('./mock');
  return new MockPlatform();
}
