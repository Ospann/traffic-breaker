import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface GameOverActions {
  again(): void;
  menu(): void;
  doubleCoins(): void;
}

export interface GameOverData {
  score: number;
  distance: number;
  best: number;
  newBest: boolean;
  coins: number;
  doubled: boolean;
  missionsDone: number;
  multiplierUp: number | null;
}

export class GameOverScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly score: HTMLDivElement;
  private readonly distance: HTMLDivElement;
  private readonly coins: HTMLDivElement;
  private readonly best: HTMLDivElement;
  private readonly record: HTMLDivElement;
  private readonly progress: HTMLDivElement;
  private readonly again: HTMLButtonElement;
  private readonly double: HTMLButtonElement;
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
    this.coins = el('div', cx(styles, 'line'), this.root);
    this.best = el('div', cx(styles, 'line'), this.root);
    this.record = el('div', cx(styles, 'record'), this.root);
    this.progress = el('div', cx(styles, 'progress'), this.root);
    const buttons = el('div', cx(styles, 'actions'), this.root);
    this.double = createButton(buttons, 'primary', () => actions.doubleCoins());
    this.double.classList.add(cx(styles, 'reward'));
    this.again = createButton(buttons, 'primary', () => actions.again());
    this.menu = createButton(buttons, 'secondary', () => actions.menu());
  }

  render(data: GameOverData): void {
    const { i18n } = this;
    setText(this.title, i18n.t('gameover.title'));
    setText(this.score, i18n.t('gameover.score', { score: data.score }));
    setText(this.distance, i18n.t('gameover.distance', { meters: Math.floor(data.distance) }));
    setText(this.best, i18n.t('gameover.best', { score: data.best }));
    setText(this.coins, i18n.t('gameover.coins', { coins: data.coins }));
    setText(this.record, data.newBest ? i18n.t('gameover.newBest') : '');
    const lines: string[] = [];
    if (data.missionsDone > 0) {
      lines.push(i18n.t('gameover.missionsDone', { count: data.missionsDone }));
    }
    if (data.multiplierUp !== null) {
      lines.push(i18n.t('gameover.multiplierUp', { n: data.multiplierUp }));
    }
    setText(this.progress, lines.join(' · '));
    setText(this.again, i18n.t('gameover.again'));
    this.setBusy(false);
    this.setDoubled(data.coins <= 0 ? null : data.doubled);
    setText(this.menu, i18n.t('gameover.menu'));
  }

  setDoubled(doubled: boolean | null): void {
    this.double.hidden = doubled === null;
    this.double.disabled = doubled === true;
    setText(this.double, this.i18n.t(doubled ? 'gameover.coinsDoubled' : 'gameover.doubleCoins'));
  }

  setBusy(busy: boolean): void {
    if (busy) this.double.disabled = true;
    this.again.disabled = busy;
    this.menu.disabled = busy;
  }

  updateCoins(coins: number): void {
    setText(this.coins, this.i18n.t('gameover.coins', { coins }));
  }
}
