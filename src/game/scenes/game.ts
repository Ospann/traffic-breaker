import Phaser from 'phaser';
import { gameConfig } from '../config';
import { AssetKey, SceneKey } from '../keys';
import { scenePhysics } from '../physics';
import { services } from '../services';
import { addLabel } from '../ui/text';

export interface GameOverData {
  score: number;
}

export class GameScene extends Phaser.Scene {
  private score = 0;
  private remainingMs = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private finished = false;

  constructor() {
    super({ key: SceneKey.Game, ...scenePhysics() });
  }

  create(): void {
    const { i18n, platform, gameplay } = services();
    const { width, height } = this.scale;

    this.score = 0;
    this.finished = false;
    this.remainingMs = gameConfig.levelDurationSec * 1000;

    this.scoreText = addLabel(this, width / 2, 110, '', 56);
    this.timeText = addLabel(this, width / 2, 180, '', 40, '#c9cbe0');
    const hint = addLabel(this, width / 2, height / 2, i18n.t('game.hint'), 52, '#8e92b3');

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.finished) return;
      hint.setVisible(false);
      this.score += 1;
      this.spawnStar(pointer.x, pointer.y);
      this.sound.play(AssetKey.Tap);
      this.renderHud();
    });

    this.renderHud();
    platform.levelStart({ level: '1' });
    gameplay.start();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
    });
  }

  override update(_time: number, delta: number): void {
    if (this.finished) return;
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) {
      this.remainingMs = 0;
      this.finish();
    }
    this.renderHud();
  }

  private finish(): void {
    const { platform, gameplay, ads, save } = services();
    this.finished = true;
    gameplay.stop();
    platform.levelComplete({ level: '1' });
    ads.markLevelCompleted();
    save.update((data) => {
      data.levelsCompleted += 1;
      data.bestScore = Math.max(data.bestScore, this.score);
    });
    this.scene.start(SceneKey.GameOver, { score: this.score } satisfies GameOverData);
  }

  private renderHud(): void {
    const { i18n } = services();
    this.scoreText.setText(i18n.t('game.score', { score: this.score }));
    this.timeText.setText(i18n.t('game.time', { seconds: Math.ceil(this.remainingMs / 1000) }));
  }

  private spawnStar(x: number, y: number): void {
    const star = this.add.image(x, y, AssetKey.Star).setScale(0.4);
    this.tweens.add({
      targets: star,
      y: y - 140,
      scale: 0.9,
      alpha: 0,
      angle: Phaser.Math.Between(-90, 90),
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}
