import { describe, expect, it } from 'vitest';
import { SwipeDetector } from '../src/game/input/swipe-detector';

function drag(
  detector: SwipeDetector,
  from: [number, number],
  to: [number, number],
  durationMs: number,
  steps = 6,
  start = 0,
): (string | null)[] {
  const results: (string | null)[] = [];
  detector.down(1, from[0], from[1], start);
  for (let i = 1; i <= steps; i += 1) {
    const k = i / steps;
    results.push(
      detector.move(
        1,
        from[0] + (to[0] - from[0]) * k,
        from[1] + (to[1] - from[1]) * k,
        start + durationMs * k,
      ),
    );
  }
  return results;
}

describe('SwipeDetector', () => {
  it.each([
    ['left', [300, 600], [200, 600]],
    ['right', [300, 600], [400, 610]],
    ['up', [300, 600], [310, 480]],
    ['down', [300, 600], [290, 720]],
  ] as const)('recognises %s by dominant axis', (direction, from, to) => {
    const detector = new SwipeDetector();
    expect(drag(detector, [...from], [...to], 80).filter(Boolean)).toEqual([direction]);
  });

  it('fires during the move, before the finger is lifted', () => {
    const detector = new SwipeDetector();
    const results = drag(detector, [300, 600], [420, 600], 120, 6);
    expect(results.indexOf('right')).toBeGreaterThanOrEqual(0);
    expect(results.indexOf('right')).toBeLessThan(results.length - 1);
  });

  it('ignores slow drags', () => {
    const detector = new SwipeDetector();
    expect(drag(detector, [300, 600], [380, 600], 1500, 30).filter(Boolean)).toEqual([]);
  });

  it('ignores short movements', () => {
    const detector = new SwipeDetector();
    expect(drag(detector, [300, 600], [320, 600], 30).filter(Boolean)).toEqual([]);
  });

  it('chains different directions within one touch but not the same one', () => {
    const detector = new SwipeDetector();
    detector.down(1, 300, 600, 0);
    const fired: (string | null)[] = [];
    for (let i = 1; i <= 10; i += 1) fired.push(detector.move(1, 300 - i * 15, 600, i * 10));
    for (let i = 1; i <= 10; i += 1) fired.push(detector.move(1, 150, 600 - i * 15, 100 + i * 10));
    expect(fired.filter(Boolean)).toEqual(['left', 'up']);
  });

  it('detects a double tap and not a single tap', () => {
    const detector = new SwipeDetector();
    detector.down(1, 300, 600, 0);
    expect(detector.up(1, 302, 601, 80)).toBeNull();
    detector.down(2, 305, 598, 200);
    expect(detector.up(2, 305, 598, 260)).toBe('doubleTap');
  });

  it('does not treat taps far apart in time as a double tap', () => {
    const detector = new SwipeDetector();
    detector.down(1, 300, 600, 0);
    detector.up(1, 300, 600, 80);
    detector.down(1, 300, 600, 700);
    expect(detector.up(1, 300, 600, 760)).toBeNull();
  });

  it('a swipe between taps breaks the double tap', () => {
    const detector = new SwipeDetector();
    detector.down(1, 300, 600, 0);
    detector.up(1, 300, 600, 60);
    drag(detector, [300, 600], [420, 600], 80, 4, 100);
    detector.up(1, 420, 600, 190);
    detector.down(1, 300, 600, 230);
    expect(detector.up(1, 300, 600, 280)).toBeNull();
  });
});
