import type { Action } from './actions';

const KEY_ACTIONS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'dash',
  ShiftLeft: 'shield',
  ShiftRight: 'shield',
};

export function keyToAction(code: string): Action | null {
  return KEY_ACTIONS[code] ?? null;
}

export function listenKeyboard(
  onAction: (action: Action) => void,
  onKey?: (code: string) => void,
): () => void {
  const handler = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    const action = keyToAction(event.code);
    if (action) {
      event.preventDefault();
      onAction(action);
    }
    onKey?.(event.code);
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
