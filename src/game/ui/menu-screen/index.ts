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
  private readonly missionPanel: HTMLDivElement;
  private readonly missionsButton: HTMLButtonElement;
  private readonly missionsClose: HTMLButtonElement;
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
    const corner = el('div', cx(styles, 'corner'), this.root);
    this.sound = createButton(corner, 'icon', () => actions.toggleSound());
    this.language = createButton(corner, 'icon', () => actions.nextLanguage());
    this.sound.classList.add(cx(styles, 'cornerButton'));
    this.language.classList.add(cx(styles, 'cornerButton'));
    this.title = el('div', cx(styles, 'title'), this.root);
    this.title.lang = 'en';
    this.subtitle = el('div', cx(styles, 'subtitle'), this.root);
    this.best = el('div', cx(styles, 'best'), this.root);
    el('div', cx(styles, 'spacer'), this.root);
    const buttons = el('div', cx(styles, 'actions'), this.root);
    this.play = createButton(buttons, 'primary', () => actions.play());
    this.play.classList.add(cx(styles, 'play'));
    this.boosted = createButton(buttons, 'secondary', () => actions.boostedStart());
    this.boosted.classList.add(cx(styles, 'reward'));
    const row = el('div', cx(styles, 'row'), buttons);
    this.garage = createButton(row, 'secondary', () => actions.garage());
    this.missionsButton = createButton(row, 'secondary', () => this.toggleMissions(true));
    this.garage.classList.add(cx(styles, 'half'));
    this.missionsButton.classList.add(cx(styles, 'half'));
    this.hint = el('div', cx(styles, 'hint'), this.root);
    this.missionPanel = el('div', cx(styles, 'overlay'), this.root);
    this.missionPanel.hidden = true;
    this.missionPanel.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.missionPanel.addEventListener('click', (event) => {
      if (event.target === this.missionPanel) this.toggleMissions(false);
    });
    const card = el('div', cx(styles, 'card'), this.missionPanel);
    this.missions = new MissionList(card, i18n);
    this.missionsClose = createButton(card, 'secondary', () => this.toggleMissions(false));
  }

  override hide(): void {
    this.toggleMissions(false);
    super.hide();
  }

  private toggleMissions(open: boolean): void {
    this.missionPanel.hidden = !open;
  }

  render(data: MenuData): void {
    const { i18n } = this;
    setText(this.title, i18n.t('menu.title'));
    setText(this.subtitle, i18n.t('menu.subtitle'));
    setText(this.best, i18n.t('menu.best', { score: data.best }));
    setText(this.coins, String(data.coins));
    setText(this.play, i18n.t('menu.play'));
    setText(this.garage, i18n.t('menu.garage'));
    const done = data.missions.done.filter(Boolean).length;
    setText(this.missionsButton, i18n.t('menu.missionsButton', { done, total: 3 }));
    setText(this.missionsClose, i18n.t('garage.back'));
    setText(this.boosted, i18n.t('menu.boostStart'));
    this.setBusy(false);
    const soundLabel = i18n.t(data.soundEnabled ? 'menu.sound.on' : 'menu.sound.off');
    setText(this.sound, data.soundEnabled ? '♪' : '✕');
    this.sound.title = soundLabel;
    this.sound.setAttribute('aria-label', soundLabel);
    const languageLabel = i18n.t('menu.language', {
      language: i18n.t(`language.${i18n.language}`),
    });
    setText(this.language, i18n.language.toUpperCase());
    this.language.title = languageLabel;
    this.language.setAttribute('aria-label', languageLabel);
    setText(this.hint, i18n.t('menu.controls'));
    this.missions.render(data.missions, data.multiplier);
  }

  setBusy(busy: boolean): void {
    this.play.disabled = busy;
    this.boosted.disabled = busy;
    this.garage.disabled = busy;
  }
}
