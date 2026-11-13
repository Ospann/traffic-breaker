import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface HudData {
  score: number;
  thrust: number;
  droneNear: boolean;
}

export class Hud extends Screen {
  private readonly score: HTMLDivElement;
  private readonly drone: HTMLDivElement;
  private readonly thrust: HTMLDivElement;
  private readonly thrustLabel: HTMLDivElement;
  private readonly thrustFill: HTMLDivElement;
  private readonly pause: HTMLButtonElement;
  private lastScore = -1;
  private lastThrust = -1;
  private lastReady: boolean | null = null;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    onPause: () => void,
  ) {
    super(parent, cx(styles, 'root'));
    this.score = el('div', cx(styles, 'score'), this.root);
    this.drone = el('div', cx(styles, 'drone'), this.root);
    this.thrust = el('div', cx(styles, 'thrust'), this.root);
    this.thrustLabel = el('div', cx(styles, 'thrustLabel'), this.thrust);
    const bar = el('div', cx(styles, 'thrustBar'), this.thrust);
    this.thrustFill = el('div', cx(styles, 'thrustFill'), bar);
    this.pause = createButton(this.root, 'icon', onPause);
    this.pause.classList.add(cx(styles, 'pause'));
    this.pause.textContent = 'II';
    this.drone.hidden = true;
  }

  refreshTexts(): void {
    this.lastReady = null;
    this.pause.setAttribute('aria-label', this.i18n.t('hud.pause'));
    setText(this.drone, this.i18n.t('hud.drone'));
  }

  render(data: HudData): void {
    if (data.score !== this.lastScore) {
      this.lastScore = data.score;
      setText(this.score, this.i18n.t('hud.score', { score: data.score }));
    }
    const thrust = Math.round(data.thrust * 200) / 200;
    if (thrust !== this.lastThrust) {
      this.lastThrust = thrust;
      this.thrustFill.style.transform = `scaleX(${thrust})`;
    }
    const ready = data.thrust >= 1;
    if (ready !== this.lastReady) {
      this.lastReady = ready;
      this.thrust.classList.toggle(cx(styles, 'ready'), ready);
      setText(this.thrustLabel, this.i18n.t(ready ? 'hud.thrustReady' : 'hud.thrust'));
    }
    this.drone.hidden = !data.droneNear;
  }
}
