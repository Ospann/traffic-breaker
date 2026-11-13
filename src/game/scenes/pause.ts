import Phaser from 'phaser';
import { SceneKey } from '../keys';
import { services } from '../services';
import { Button } from '../ui/button';
import { addLabel } from '../ui/text';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Pause);
  }

  create(): void {
    const { i18n } = services();
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setInteractive();
    addLabel(this, width / 2, height * 0.4, i18n.t('pause.title'), 80);
    Button.create(this, width / 2, height * 0.55, i18n.t('pause.resume'), () => {
      resumeGame(this.game);
    });
  }
}

export function pauseGame(game: Phaser.Game): void {
  const { scene } = game;
  if (!scene.isActive(SceneKey.Game) || scene.isActive(SceneKey.Pause)) return;
  const { gameplay, mute } = services();
  scene.pause(SceneKey.Game);
  gameplay.stop();
  mute.set('pause', true);
  scene.run(SceneKey.Pause);
  scene.bringToTop(SceneKey.Pause);
}

export function resumeGame(game: Phaser.Game): void {
  const { gameplay, mute } = services();
  game.scene.stop(SceneKey.Pause);
  game.scene.resume(SceneKey.Game);
  mute.set('pause', false);
  gameplay.start();
}
