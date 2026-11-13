import { bonusTypes, type BonusType } from '../../balance';
import type { GameI18n } from '../../../i18n';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export interface HudData {
  score: number;
  coins: number;
  thrust: number;
  droneNear: boolean;
  multiplier: number;
  bonuses: Readonly<Record<BonusType, number>>;
  shields: number;
  shieldLeft: number;
}

const bonusAccent: Readonly<Record<BonusType, string>> = {
  fullTank: '#ffb020',
  magnet: '#ff2244',
  double: '#8a4dff',
  superJump: '#8dff3a',
};

const bonusLabel: Readonly<Record<BonusType, `bonus.${BonusType}`>> = {
  fullTank: 'bonus.fullTank',
  magnet: 'bonus.magnet',
  double: 'bonus.double',
  superJump: 'bonus.superJump',
};

interface BonusChip {
  root: HTMLDivElement;
  label: HTMLDivElement;
  bar: HTMLDivElement;
}

export class Hud extends Screen {
  private readonly score: HTMLDivElement;
  private readonly coins: HTMLDivElement;
  private readonly multiplier: HTMLDivElement;
  private readonly drone: HTMLDivElement;
  private readonly thrust: HTMLDivElement;
  private readonly thrustLabel: HTMLDivElement;
  private readonly thrustFill: HTMLDivElement;
  private readonly pause: HTMLButtonElement;
  private readonly shield: HTMLButtonElement;
  private readonly chips = new Map<BonusType, BonusChip>();
  private lastScore = -1;
  private lastCoins = -1;
  private lastThrust = -1;
  private lastMultiplier = -1;
  private lastReady: boolean | null = null;
  private lastShield = '';
  private toast: HTMLDivElement | null = null;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    onPause: () => void,
    onShield: () => void,
  ) {
    super(parent, cx(styles, 'root'));
    this.score = el('div', cx(styles, 'score'), this.root);
    this.multiplier = el('div', cx(styles, 'multiplier'), this.root);
    const coins = el('div', cx(styles, 'coins'), this.root);
    el('div', cx(styles, 'coinIcon'), coins);
    this.coins = el('div', '', coins);
    this.drone = el('div', cx(styles, 'drone'), this.root);
    const bonusList = el('div', cx(styles, 'bonuses'), this.root);
    for (const type of bonusTypes) {
      const root = el('div', cx(styles, 'bonus'), bonusList);
      root.style.setProperty('--accent', bonusAccent[type]);
      const label = el('div', '', root);
      const bar = el('div', cx(styles, 'bonusBar'), root);
      root.hidden = true;
      this.chips.set(type, { root, label, bar });
    }
    this.thrust = el('div', cx(styles, 'thrust'), this.root);
    this.thrustLabel = el('div', cx(styles, 'thrustLabel'), this.thrust);
    const bar = el('div', cx(styles, 'thrustBar'), this.thrust);
    this.thrustFill = el('div', cx(styles, 'thrustFill'), bar);
    this.pause = createButton(this.root, 'icon', onPause);
    this.pause.classList.add(cx(styles, 'pause'));
    this.pause.textContent = 'II';
    this.shield = el('button', cx(styles, 'shield'), this.root);
    this.shield.type = 'button';
    this.shield.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      onShield();
    });
    this.drone.hidden = true;
  }

  showToast(title: string, text: string): void {
    this.toast?.remove();
    const toast = el('div', cx(styles, 'toast'), this.root);
    el('div', cx(styles, 'toastTitle'), toast).textContent = title;
    el('div', cx(styles, 'toastText'), toast).textContent = text;
    toast.addEventListener('animationend', () => toast.remove());
    this.toast = toast;
  }

  refreshTexts(): void {
    this.lastReady = null;
    this.lastShield = '';
    this.pause.setAttribute('aria-label', this.i18n.t('hud.pause'));
    setText(this.drone, this.i18n.t('hud.drone'));
    for (const [type, chip] of this.chips) setText(chip.label, this.i18n.t(bonusLabel[type]));
  }

  render(data: HudData): void {
    if (data.score !== this.lastScore) {
      this.lastScore = data.score;
      setText(this.score, this.i18n.t('hud.score', { score: data.score }));
    }
    if (data.coins !== this.lastCoins) {
      this.lastCoins = data.coins;
      setText(this.coins, String(data.coins));
    }
    if (data.multiplier !== this.lastMultiplier) {
      this.lastMultiplier = data.multiplier;
      setText(this.multiplier, data.multiplier > 1 ? `x${data.multiplier}` : '');
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
    for (const [type, chip] of this.chips) {
      const left = data.bonuses[type];
      chip.root.hidden = left <= 0;
      if (left > 0) chip.bar.style.transform = `scaleX(${Math.round(left * 100) / 100})`;
    }
    this.drone.hidden = !data.droneNear;
    this.renderShield(data);
  }

  private renderShield(data: HudData): void {
    const active = data.shieldLeft > 0;
    const key = active ? `a${Math.ceil(data.shieldLeft)}` : `n${data.shields}`;
    if (key === this.lastShield) return;
    this.lastShield = key;
    this.shield.disabled = !active && data.shields <= 0;
    this.shield.classList.toggle(cx(styles, 'shieldActive'), active);
    setText(
      this.shield,
      active
        ? this.i18n.t('hud.shieldActive', { seconds: Math.ceil(data.shieldLeft) })
        : this.i18n.t('hud.shield', { count: data.shields }),
    );
  }
}
