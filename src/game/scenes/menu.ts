import Phaser from 'phaser';
import type { Language } from '../../i18n';
import { SceneKey } from '../keys';
import { services } from '../services';
import { Button } from '../ui/button';
import { addLabel } from '../ui/text';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Menu);
  }

  create(): void {
    const { i18n, save, mute } = services();
    const { width, height } = this.scale;
    const cx = width / 2;

    const title = addLabel(this, cx, height * 0.22, i18n.t('menu.title'), 96);
    const best = addLabel(this, cx, height * 0.32, '', 40, '#c9cbe0');

    const play = new Button(this, cx, height * 0.5, '', () => {
      this.scene.start(SceneKey.Game);
    });

    const sound = new Button(
      this,
      cx,
      height * 0.62,
      '',
      () => {
        const enabled = !save.data.soundEnabled;
        save.set('soundEnabled', enabled);
        mute.set('settings', !enabled);
        render();
      },
      { color: 0x3a3f58 },
    );

    const language = new Button(
      this,
      cx,
      height * 0.74,
      '',
      () => {
        const list = i18n.languages;
        const next: Language = list[(list.indexOf(i18n.language) + 1) % list.length] ?? 'en';
        i18n.setLanguage(next);
        save.set('language', next);
        render();
      },
      { color: 0x3a3f58 },
    );

    const render = (): void => {
      title.setText(i18n.t('menu.title'));
      best.setText(i18n.t('menu.best', { score: save.data.bestScore }));
      play.setText(i18n.t('menu.play'));
      sound.setText(i18n.t(save.data.soundEnabled ? 'menu.sound.on' : 'menu.sound.off'));
      language.setText(i18n.t('menu.language', { language: i18n.t(`language.${i18n.language}`) }));
    };

    render();
  }
}
