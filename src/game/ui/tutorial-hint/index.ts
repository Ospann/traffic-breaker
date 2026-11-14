import type { GameI18n } from '../../../i18n';
import type { TutorialStepId } from '../../tutorial/tutorial-director';
import { cx, el, setText } from '../dom';
import styles from './index.module.css';

const arrowRotation: Readonly<Record<TutorialStepId, readonly number[]>> = {
  lane: [-135, 45],
  jump: [-45],
  duck: [135],
  dash: [],
};

const gestureClass: Readonly<Record<TutorialStepId, string>> = {
  lane: 'left',
  jump: 'up',
  duck: 'down',
  dash: 'tap',
};

const ARROW_OFFSET = 90;

export class TutorialHint {
  private readonly root: HTMLDivElement;
  private readonly gesture: HTMLDivElement;
  private readonly text: HTMLDivElement;

  constructor(
    private readonly parent: HTMLElement,
    private readonly i18n: GameI18n,
    private readonly touch: boolean,
  ) {
    this.root = el('div', cx(styles, 'root'), parent);
    this.gesture = el('div', cx(styles, 'gesture'), this.root);
    this.text = el('div', cx(styles, 'text'), this.root);
    this.root.hidden = true;
  }

  show(step: TutorialStepId): void {
    this.gesture.className = cx(styles, 'gesture', gestureClass[step]);
    this.gesture.replaceChildren();
    for (const angle of arrowRotation[step]) {
      const arrow = el('div', cx(styles, 'arrow'), this.gesture);
      const rad = ((angle - 45) * Math.PI) / 180;
      const dx = Math.cos(rad) * ARROW_OFFSET;
      const dy = Math.sin(rad) * ARROW_OFFSET;
      arrow.style.transform = `translate(calc(var(--u) * ${dx.toFixed(1)}), calc(var(--u) * ${dy.toFixed(1)})) rotate(${angle}deg)`;
    }
    el('div', cx(styles, 'finger'), this.gesture);
    setText(this.text, this.i18n.t(`tutorial.${step}.${this.touch ? 'touch' : 'keys'}`));
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  praise(text: string): void {
    const node = el('div', cx(styles, 'praise'), this.parent);
    node.textContent = text;
    node.addEventListener('animationend', () => node.remove());
  }
}
