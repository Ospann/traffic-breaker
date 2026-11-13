import Phaser from 'phaser';
import { SceneKey } from '../keys';
import { services } from '../services';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  async create(): Promise<void> {
    const { platform, save, i18n, mute } = services();

    try {
      await platform.init();
    } catch (error) {
      console.error('[boot] platform.init failed', error);
    }

    const data = await save.load();
    i18n.setLanguage(data.language ?? platform.getLanguage());
    mute.set('settings', !data.soundEnabled);
    mute.set('platform', !platform.isAudioEnabled());

    this.scene.start(SceneKey.Preload);
  }
}
