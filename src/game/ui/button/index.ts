import { cx, el } from '../dom';
import styles from './index.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'icon';

export function createButton(
  parent: HTMLElement,
  variant: ButtonVariant,
  onClick: () => void,
): HTMLButtonElement {
  const names = ['button'];
  if (variant !== 'primary') names.push(variant);
  const button = el('button', cx(styles, ...names), parent);
  button.type = 'button';
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  return button;
}
