import type { PlatformStorage } from './types';

export class LocalStorageStore implements PlatformStorage {
  constructor(private readonly prefix = '') {}

  async get(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    window.localStorage.setItem(this.prefix + key, value);
  }
}
