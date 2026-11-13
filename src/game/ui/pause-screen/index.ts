import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface PauseActions {
  resume(): void;
  menu(): void;
}

export class PauseScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly resume: HTMLButtonElement;
  private readonly menu: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    actions: PauseActions,
  ) {
    super(parent, cx(styles, 'root'));
    this.title = el('div', cx(styles, 'title'), this.root);
    this.resume = createButton(this.root, 'primary', () => actions.resume());
    this.menu = createButton(this.root, 'secondary', () => actions.menu());
  }

  render(): void {
    setText(this.title, this.i18n.t('pause.title'));
    setText(this.resume, this.i18n.t('pause.resume'));
    setText(this.menu, this.i18n.t('pause.menu'));
  }
}
