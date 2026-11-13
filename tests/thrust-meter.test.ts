import { describe, expect, it } from 'vitest';
import { ThrustMeter } from '../src/game/sim/thrust-meter';

describe('ThrustMeter', () => {
  it('charges over time and clamps at full', () => {
    const meter = new ThrustMeter({ chargeSec: 10 });
    meter.tick(5);
    expect(meter.level).toBeCloseTo(0.5);
    meter.tick(20);
    expect(meter.level).toBe(1);
    expect(meter.isFull).toBe(true);
  });

  it('accepts extra charge and only consumes when full', () => {
    const meter = new ThrustMeter({ chargeSec: 10 });
    meter.add(0.6);
    expect(meter.consume()).toBe(false);
    meter.add(0.6);
    expect(meter.consume()).toBe(true);
    expect(meter.level).toBe(0);
  });
});
