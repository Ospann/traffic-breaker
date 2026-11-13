import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface MenuActions {
  play(): void;
  toggleSound(): void;
  nextLanguage(): void;
}

export interface MenuData {
  best: number;
  soundEnabled: boolean;
}

export class MenuScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly subtitle: HTMLDivElement;
  private readonly best: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly play: HTMLButtonElement;
  private readonly sound: HTMLButtonElement;
  private readonly language: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    actions: MenuActions,
  ) {
    super(parent, cx(styles, 'root'));
    this.title = el('div', cx(styles, 'title'), this.root);
    this.subtitle = el('div', cx(styles, 'subtitle'), this.root);
    this.best = el('div', cx(styles, 'best'), this.root);
    el('div', cx(styles, 'spacer'), this.root);
    const buttons = el('div', cx(styles, 'actions'), this.root);
    this.play = createButton(buttons, 'primary', () => actions.play());
    this.sound = createButton(buttons, 'secondary', () => actions.toggleSound());
    this.language = createButton(buttons, 'secondary', () => actions.nextLanguage());
    this.hint = el('div', cx(styles, 'hint'), this.root);
  }

  render(data: MenuData): void {
    const { i18n } = this;
    setText(this.title, i18n.t('menu.title'));
    setText(this.subtitle, i18n.t('menu.subtitle'));
    setText(this.best, i18n.t('menu.best', { score: data.best }));
    setText(this.play, i18n.t('menu.play'));
    setText(this.sound, i18n.t(data.soundEnabled ? 'menu.sound.on' : 'menu.sound.off'));
    setText(
      this.language,
      i18n.t('menu.language', { language: i18n.t(`language.${i18n.language}`) }),
    );
    setText(this.hint, i18n.t('menu.controls'));
  }
}
