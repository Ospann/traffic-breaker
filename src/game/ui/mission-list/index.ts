import type { GameI18n } from '../../../i18n';
import {
  missionSet,
  missionValue,
  type MissionState,
  type RunMetrics,
} from '../../progression/missions';
import { cx, el } from '../dom';
import styles from './index.module.css';

const zeroMetrics: RunMetrics = {
  coins: 0,
  distance: 0,
  score: 0,
  jumps: 0,
  barriersJumped: 0,
  ducksUnder: 0,
  dashes: 0,
  roofs: 0,
  rampLaunches: 0,
  bonuses: 0,
};

export class MissionList {
  readonly root: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly i18n: GameI18n,
  ) {
    this.root = el('div', cx(styles, 'root'), parent);
  }

  render(state: MissionState, multiplier: number): void {
    const { i18n } = this;
    this.root.replaceChildren();
    const heading = el('div', cx(styles, 'heading'), this.root);
    el('span', '', heading).textContent = i18n.t('menu.missions', { n: state.set + 1 });
    el('span', cx(styles, 'multiplier'), heading).textContent = i18n.t('menu.multiplier', {
      n: multiplier,
    });
    missionSet(state.set).forEach((spec, index) => {
      const done = state.done[index] ?? false;
      const item = el('div', cx(styles, ...(done ? ['item', 'done'] : ['item'])), this.root);
      el('div', cx(styles, 'check'), item).textContent = done ? '✓' : '';
      el('div', cx(styles, 'text'), item).textContent = i18n.t(
        `mission.${spec.metric}.${spec.scope}`,
        { n: spec.target },
      );
      if (!done && spec.scope === 'total') {
        el('div', cx(styles, 'progress'), item).textContent = i18n.t('mission.progress', {
          value: Math.min(missionValue(spec, state, index, zeroMetrics), spec.target),
          target: spec.target,
        });
      }
    });
  }
}
