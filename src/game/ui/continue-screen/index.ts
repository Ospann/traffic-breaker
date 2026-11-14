import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface ContinueActions {
  watch(): void;
  skip(): void;
}

export class ContinueScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly left: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly watch: HTMLButtonElement;
  private readonly skip: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    actions: ContinueActions,
  ) {
    super(parent, cx(styles, 'root'));
    this.title = el('div', cx(styles, 'title'), this.root);
    const timer = el('div', cx(styles, 'timer'), this.root);
    this.fill = el('div', cx(styles, 'timerFill'), timer);
    this.watch = createButton(this.root, 'primary', () => actions.watch());
    this.left = el('div', cx(styles, 'left'), this.root);
    this.status = el('div', cx(styles, 'status'), this.root);
    this.skip = createButton(this.root, 'secondary', () => actions.skip());
  }

  render(revivesLeft: number): void {
    const { i18n } = this;
    setText(this.title, i18n.t('continue.title'));
    setText(this.watch, i18n.t('continue.watch'));
    setText(this.skip, i18n.t('continue.skip'));
    setText(this.left, i18n.t('continue.left', { count: revivesLeft }));
    setText(this.status, '');
    this.setBusy(false);
    this.setProgress(1);
  }

  setProgress(ratio: number): void {
    this.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  }

  setBusy(busy: boolean): void {
    this.watch.disabled = busy;
    this.skip.disabled = busy;
  }

  showUnavailable(): void {
    setText(this.status, this.i18n.t('ad.unavailable'));
  }
}
