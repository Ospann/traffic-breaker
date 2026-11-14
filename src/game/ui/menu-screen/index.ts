import type { GameI18n } from '../../../i18n';
import type { MissionState } from '../../progression/missions';
import { createButton } from '../button';
import { cx, el, Screen, setText } from '../dom';
import { MissionList } from '../mission-list';
import styles from './index.module.css';

export interface MenuActions {
  play(): void;
  boostedStart(): void;
  garage(): void;
  toggleSound(): void;
  nextLanguage(): void;
}

export interface MenuData {
  best: number;
  coins: number;
  soundEnabled: boolean;
  missions: MissionState;
  multiplier: number;
}

export class MenuScreen extends Screen {
  private readonly title: HTMLDivElement;
  private readonly subtitle: HTMLDivElement;
  private readonly best: HTMLDivElement;
  private readonly coins: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly missions: MissionList;
  private readonly play: HTMLButtonElement;
  private readonly garage: HTMLButtonElement;
  private readonly boosted: HTMLButtonElement;
  private readonly sound: HTMLButtonElement;
  private readonly language: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
    actions: MenuActions,
  ) {
    super(parent, cx(styles, 'root'));
    const wallet = el('div', cx(styles, 'wallet'), this.root);
    el('div', cx(styles, 'coin'), wallet);
    this.coins = el('div', '', wallet);
    this.title = el('div', cx(styles, 'title'), this.root);
    this.title.lang = 'en';
    this.subtitle = el('div', cx(styles, 'subtitle'), this.root);
    this.best = el('div', cx(styles, 'best'), this.root);
    el('div', cx(styles, 'spacer'), this.root);
    const missionBox = el('div', cx(styles, 'missions'), this.root);
    this.missions = new MissionList(missionBox, i18n);
    const buttons = el('div', cx(styles, 'actions'), this.root);
    this.play = createButton(buttons, 'primary', () => actions.play());
    this.boosted = createButton(buttons, 'secondary', () => actions.boostedStart());
    this.boosted.classList.add(cx(styles, 'reward'));
    this.garage = createButton(buttons, 'secondary', () => actions.garage());
    const row = el('div', cx(styles, 'row'), buttons);
    this.sound = createButton(row, 'secondary', () => actions.toggleSound());
    this.language = createButton(row, 'secondary', () => actions.nextLanguage());
    this.sound.classList.add(cx(styles, 'small'));
    this.language.classList.add(cx(styles, 'small'));
    this.hint = el('div', cx(styles, 'hint'), this.root);
  }

  render(data: MenuData): void {
    const { i18n } = this;
    setText(this.title, i18n.t('menu.title'));
    setText(this.subtitle, i18n.t('menu.subtitle'));
    setText(this.best, i18n.t('menu.best', { score: data.best }));
    setText(this.coins, String(data.coins));
    setText(this.play, i18n.t('menu.play'));
    setText(this.garage, i18n.t('menu.garage'));
    setText(this.boosted, i18n.t('menu.boostStart'));
    this.setBusy(false);
    setText(this.sound, i18n.t(data.soundEnabled ? 'menu.sound.on' : 'menu.sound.off'));
    setText(
      this.language,
      i18n.t('menu.language', { language: i18n.t(`language.${i18n.language}`) }),
    );
    setText(this.hint, i18n.t('menu.controls'));
    this.missions.render(data.missions, data.multiplier);
  }

  setBusy(busy: boolean): void {
    this.play.disabled = busy;
    this.boosted.disabled = busy;
    this.garage.disabled = busy;
  }
}
