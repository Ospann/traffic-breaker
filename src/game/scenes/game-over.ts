import Phaser from 'phaser';
import { SceneKey } from '../keys';
import { services } from '../services';
import { Button } from '../ui/button';
import { addLabel } from '../ui/text';
import type { GameOverData } from './game';

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private doubled = false;
  private busy = false;

  constructor() {
    super(SceneKey.GameOver);
  }

  init(data: Partial<GameOverData>): void {
    this.score = data.score ?? 0;
    this.doubled = false;
    this.busy = false;
  }

  create(): void {
    const { i18n, ads, save } = services();
    const { width, height } = this.scale;
    const cx = width / 2;
    const isNewBest = this.score > 0 && this.score >= save.data.bestScore;

    addLabel(this, cx, height * 0.2, i18n.t('gameover.title'), 80);
    const scoreText = addLabel(this, cx, height * 0.3, '', 64);
    const bestText = addLabel(this, cx, height * 0.37, '', 40, '#c9cbe0');
    const status = addLabel(this, cx, height * 0.43, '', 40, '#ffd34d');
    if (isNewBest) status.setText(i18n.t('gameover.newBest'));

    const render = (): void => {
      scoreText.setText(i18n.t('gameover.score', { score: this.score }));
      bestText.setText(i18n.t('gameover.best', { score: save.data.bestScore }));
    };

    Button.create(this, cx, height * 0.56, i18n.t('gameover.again'), () => {
      void this.guard(async () => {
        await ads.showInterstitial();
        this.scene.start(SceneKey.Game);
      });
    });

    const double = new Button(
      this,
      cx,
      height * 0.68,
      i18n.t('gameover.double'),
      () => {
        void this.guard(async () => {
          const rewarded = await ads.showRewarded();
          if (!rewarded || this.doubled) return;
          this.doubled = true;
          this.score *= 2;
          save.set('bestScore', Math.max(save.data.bestScore, this.score));
          double.setEnabled(false);
          status.setText(i18n.t('gameover.doubled'));
          render();
        });
      },
      { color: 0x2eb872 },
    );

    Button.create(
      this,
      cx,
      height * 0.8,
      i18n.t('gameover.menu'),
      () => {
        void this.guard(async () => {
          this.scene.start(SceneKey.Menu);
        });
      },
      { color: 0x3a3f58 },
    );

    render();
  }

  private async guard(action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await action();
    } finally {
      this.busy = false;
    }
  }
}
