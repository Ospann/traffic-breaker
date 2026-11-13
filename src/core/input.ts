import type { Unsubscribe } from './events';

const SCROLL_KEYS = new Set([
  ' ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

function prevent(event: Event): void {
  if (event.cancelable) event.preventDefault();
}

function onWheel(event: WheelEvent): void {
  if (event.ctrlKey) prevent(event);
}

function onKeyDown(event: KeyboardEvent): void {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (SCROLL_KEYS.has(event.key)) prevent(event);
}

export function installInputGuards(root: HTMLElement = document.body): Unsubscribe {
  let lastTouchEnd = 0;
  const onTouchEnd = (event: TouchEvent): void => {
    if (event.timeStamp - lastTouchEnd < 300) prevent(event);
    lastTouchEnd = event.timeStamp;
  };

  const passiveFalse: AddEventListenerOptions = { passive: false };

  root.addEventListener('contextmenu', prevent);
  root.addEventListener('selectstart', prevent);
  root.addEventListener('dragstart', prevent);
  root.addEventListener('touchmove', prevent, passiveFalse);
  root.addEventListener('touchend', onTouchEnd, passiveFalse);
  document.addEventListener('gesturestart', prevent, passiveFalse);
  document.addEventListener('gesturechange', prevent, passiveFalse);
  document.addEventListener('dblclick', prevent, passiveFalse);
  window.addEventListener('wheel', onWheel, passiveFalse);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('contextmenu', prevent);
    root.removeEventListener('selectstart', prevent);
    root.removeEventListener('dragstart', prevent);
    root.removeEventListener('touchmove', prevent, passiveFalse);
    root.removeEventListener('touchend', onTouchEnd, passiveFalse);
    document.removeEventListener('gesturestart', prevent, passiveFalse);
    document.removeEventListener('gesturechange', prevent, passiveFalse);
    document.removeEventListener('dblclick', prevent, passiveFalse);
    window.removeEventListener('wheel', onWheel, passiveFalse);
    window.removeEventListener('keydown', onKeyDown);
  };
}
