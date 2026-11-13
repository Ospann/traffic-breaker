import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface GameOverActions {
  again(): void;
  menu(): void;
}

export interface GameOverData {
  score: number;
  distance: number;
  best: number;
  newBest: boolean;
}

export class GameOverScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly score: HTMLDivElement;
  private readonly distance: HTMLDivElement;
  private readonly best: HTMLDivElement;
  private readonly record: HTMLDivElement;
  private readonly again: HTMLButtonElement;
  private readonly menu: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    actions: GameOverActions,
  ) {
    super(parent, cx(styles, 'root'));
    this.title = el('div', cx(styles, 'title'), this.root);
    this.score = el('div', cx(styles, 'score'), this.root);
    this.distance = el('div', cx(styles, 'line'), this.root);
    this.best = el('div', cx(styles, 'line'), this.root);
    this.record = el('div', cx(styles, 'record'), this.root);
    const buttons = el('div', cx(styles, 'actions'), this.root);
    this.again = createButton(buttons, 'primary', () => actions.again());
    this.menu = createButton(buttons, 'secondary', () => actions.menu());
  }

  render(data: GameOverData): void {
    const { i18n } = this;
    setText(this.title, i18n.t('gameover.title'));
    setText(this.score, i18n.t('gameover.score', { score: data.score }));
    setText(this.distance, i18n.t('gameover.distance', { meters: Math.floor(data.distance) }));
    setText(this.best, i18n.t('gameover.best', { score: data.best }));
    setText(this.record, data.newBest ? i18n.t('gameover.newBest') : '');
    setText(this.again, i18n.t('gameover.again'));
    setText(this.menu, i18n.t('gameover.menu'));
  }
}
