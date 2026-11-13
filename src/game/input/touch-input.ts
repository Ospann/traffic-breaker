import type { Action } from './actions';
import { gestureToAction, SwipeDetector } from './swipe-detector';

function isUi(event: PointerEvent): boolean {
  return event.target instanceof Element && event.target.closest('button') !== null;
}

export function listenTouch(
  element: HTMLElement,
  logicalScale: () => number,
  onAction: (action: Action) => void,
): () => void {
  const detector = new SwipeDetector();
  const point = (event: PointerEvent): [number, number] => {
    const rect = element.getBoundingClientRect();
    const scale = logicalScale();
    return [(event.clientX - rect.left) * scale, (event.clientY - rect.top) * scale];
  };

  const down = (event: PointerEvent): void => {
    if (isUi(event)) return;
    const [x, y] = point(event);
    detector.down(event.pointerId, x, y, event.timeStamp);
    element.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent): void => {
    const [x, y] = point(event);
    const samples = event.getCoalescedEvents?.() ?? [];
    if (samples.length > 1) {
      for (const sample of samples) {
        const [sx, sy] = point(sample);
        const direction = detector.move(event.pointerId, sx, sy, sample.timeStamp);
        if (direction) onAction(direction);
      }
      return;
    }
    const direction = detector.move(event.pointerId, x, y, event.timeStamp);
    if (direction) onAction(direction);
  };
  const up = (event: PointerEvent): void => {
    const [x, y] = point(event);
    const gesture = detector.up(event.pointerId, x, y, event.timeStamp);
    if (gesture) onAction(gestureToAction(gesture));
  };
  const cancel = (event: PointerEvent): void => detector.cancel(event.pointerId);

  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', cancel);
  return () => {
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', cancel);
    detector.reset();
  };
}
