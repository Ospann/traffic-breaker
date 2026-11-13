import type { GameI18n } from '../../../i18n';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export class LoadingScreen extends Screen {
  private readonly label: HTMLDivElement;
  private readonly fill: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
  ) {
    super(parent, cx(styles, 'root'));
    const title = el('div', cx(styles, 'title'), this.root);
    title.textContent = i18n.t('menu.title');
    const bar = el('div', cx(styles, 'bar'), this.root);
    this.fill = el('div', cx(styles, 'fill'), bar);
    this.label = el('div', cx(styles, 'label'), this.root);
    this.setProgress(0);
  }

  setProgress(progress: number): void {
    const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
    this.fill.style.width = `${percent}%`;
    setText(this.label, this.i18n.t('loading', { percent }));
  }
}
