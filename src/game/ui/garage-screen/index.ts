import { isTranslationKey, type GameI18n } from '../../../i18n';
import { bonusDuration, thrustChargeSec } from '../../balance';
import {
  SHIELD_MAX_STOCK,
  SHIELD_PRICE,
  skinCategories,
  skins,
  UPGRADE_MAX_LEVEL,
  upgradeKinds,
  type UpgradeKind,
} from '../../progression/catalog';
import { upgradePrice } from '../../progression/economy';
import type { GameSave } from '../../save';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import styles from './index.module.css';

export type GarageTab = 'upgrades' | 'skins' | 'shields';

const tabs: readonly GarageTab[] = ['upgrades', 'skins', 'shields'];

export interface GarageActions {
  buyUpgrade(kind: UpgradeKind): void;
  buySkin(id: string): void;
  selectSkin(id: string): void;
  buyShield(): void;
  back(): void;
}

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function upgradeValue(kind: UpgradeKind, level: number): number {
  const value = kind === 'thrust' ? thrustChargeSec(level) : bonusDuration(kind, level);
  return Math.round(value * 10) / 10;
}

export class GarageScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly wallet: HTMLDivElement;
  private readonly tabButtons = new Map<GarageTab, HTMLButtonElement>();
  private readonly list: HTMLDivElement;
  private readonly back: HTMLButtonElement;
  private tab: GarageTab = 'upgrades';
  private save: Readonly<GameSave> | null = null;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    private readonly actions: GarageActions,
  ) {
    super(parent, cx(styles, 'root'));
    const header = el('div', cx(styles, 'header'), this.root);
    this.title = el('div', cx(styles, 'title'), header);
    const wallet = el('div', cx(styles, 'wallet'), header);
    el('div', cx(styles, 'coin'), wallet);
    this.wallet = el('div', '', wallet);
    el('div', cx(styles, 'spacer'), this.root);
    const panel = el('div', cx(styles, 'panel'), this.root);
    const tabRow = el('div', cx(styles, 'tabs'), panel);
    for (const tab of tabs) {
      const button = el('button', cx(styles, 'tab'), tabRow);
      button.type = 'button';
      button.addEventListener('click', () => {
        this.tab = tab;
        this.redraw();
      });
      this.tabButtons.set(tab, button);
    }
    this.list = el('div', cx(styles, 'list'), panel);
    this.list.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    const footer = el('div', cx(styles, 'footer'), panel);
    this.back = createButton(footer, 'secondary', () => actions.back());
  }

  render(save: Readonly<GameSave>): void {
    this.save = save;
    this.redraw();
  }

  private redraw(): void {
    const save = this.save;
    if (!save) return;
    const { i18n } = this;
    setText(this.title, i18n.t('garage.title'));
    setText(this.wallet, String(save.coins));
    setText(this.back, i18n.t('garage.back'));
    for (const [tab, button] of this.tabButtons) {
      setText(button, i18n.t(`garage.tab.${tab}`));
      button.classList.toggle(cx(styles, 'tabActive'), tab === this.tab);
    }
    const scroll = this.list.scrollTop;
    this.list.replaceChildren();
    if (this.tab === 'upgrades') this.drawUpgrades(save);
    else if (this.tab === 'skins') this.drawSkins(save);
    else this.drawShields(save);
    this.list.scrollTop = scroll;
  }

  private row(): { row: HTMLDivElement; info: HTMLDivElement } {
    const row = el('div', cx(styles, 'row'), this.list);
    const info = el('div', cx(styles, 'info'), row);
    return { row, info };
  }

  private priceButton(
    parent: HTMLElement,
    price: number | null,
    coins: number,
    onBuy: () => void,
  ): void {
    const button = el('button', cx(styles, 'action'), parent);
    button.type = 'button';
    if (price === null) {
      button.textContent = this.i18n.t('garage.max');
      button.disabled = true;
      return;
    }
    button.textContent = `● ${price}`;
    button.disabled = coins < price;
    button.addEventListener('click', onBuy);
  }

  private drawUpgrades(save: Readonly<GameSave>): void {
    for (const kind of upgradeKinds) {
      const level = save.upgrades[kind];
      const { row, info } = this.row();
      el('div', cx(styles, 'name'), info).textContent = this.i18n.t(`upgrade.${kind}`);
      const value = upgradeValue(kind, level);
      el('div', cx(styles, 'desc'), info).textContent = this.i18n.t(`upgrade.${kind}.desc`, {
        value,
      });
      const pips = el('div', cx(styles, 'pips'), info);
      for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) {
        el('div', cx(styles, ...(i < level ? ['pip', 'pipOn'] : ['pip'])), pips);
      }
      this.priceButton(row, upgradePrice(level), save.coins, () => this.actions.buyUpgrade(kind));
    }
  }

  private drawSkins(save: Readonly<GameSave>): void {
    for (const category of skinCategories) {
      el('div', cx(styles, 'section'), this.list).textContent = this.i18n.t(
        `skin.category.${category}`,
      );
      for (const item of skins.filter((s) => s.category === category)) {
        const { row, info } = this.row();
        const swatch = el('div', cx(styles, 'swatch'), row);
        swatch.style.background = toHex(item.color);
        row.prepend(swatch);
        const nameKey = `skin.${item.id}`;
        el('div', cx(styles, 'name'), info).textContent = isTranslationKey(nameKey)
          ? this.i18n.t(nameKey)
          : item.id;
        const owned = save.skins.owned.includes(item.id);
        const equipped = save.skins[category] === item.id;
        if (!owned) {
          this.priceButton(row, item.price, save.coins, () => this.actions.buySkin(item.id));
          continue;
        }
        const button = el('button', cx(styles, 'action', equipped ? 'equipped' : 'equip'), row);
        button.type = 'button';
        button.textContent = this.i18n.t(equipped ? 'garage.equipped' : 'garage.equip');
        button.disabled = equipped;
        button.addEventListener('click', () => this.actions.selectSkin(item.id));
      }
    }
  }

  private drawShields(save: Readonly<GameSave>): void {
    const { row, info } = this.row();
    el('div', cx(styles, 'name'), info).textContent = this.i18n.t('garage.shields.stock', {
      count: save.shields,
      max: SHIELD_MAX_STOCK,
    });
    el('div', cx(styles, 'desc'), info).textContent = this.i18n.t('garage.shields.desc');
    this.priceButton(row, save.shields >= SHIELD_MAX_STOCK ? null : SHIELD_PRICE, save.coins, () =>
      this.actions.buyShield(),
    );
  }
}
