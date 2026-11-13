import { describe, expect, it } from 'vitest';
import { player, thrust } from '../src/game/balance';
import { laneX, PlayerMotion } from '../src/game/sim/player-motion';

const DT = 1 / 120;

function run(motion: PlayerMotion, seconds: number): void {
  for (let t = 0; t < seconds; t += DT) motion.update(DT);
}

describe('PlayerMotion', () => {
  it('changes lanes within the configured time', () => {
    const motion = new PlayerMotion();
    motion.perform('left');
    run(motion, player.laneChangeSec + DT);
    expect(motion.x).toBeCloseTo(laneX(0));
    expect(motion.isChangingLane).toBe(false);
  });

  it('refuses to leave the road', () => {
    const motion = new PlayerMotion();
    motion.lane = 0;
    expect(motion.canPerform('left', false)).toBe(false);
    expect(motion.canPerform('right', false)).toBe(true);
  });

  it('jumps to the configured height and lands after the air time', () => {
    const motion = new PlayerMotion();
    motion.perform('up');
    let peak = 0;
    let airTime = 0;
    while (!motion.isGrounded || airTime === 0) {
      motion.update(DT);
      airTime += DT;
      peak = Math.max(peak, motion.y);
      if (airTime > 3) break;
    }
    expect(peak).toBeCloseTo(player.jumpHeight, 1);
    expect(airTime).toBeCloseTo(player.jumpAirSec, 1);
    expect(motion.events).toContain('land');
  });

  it('cannot jump in the air, but can slam down and duck on landing', () => {
    const motion = new PlayerMotion();
    motion.perform('up');
    run(motion, 0.1);
    expect(motion.canPerform('up', false)).toBe(false);
    motion.perform('down');
    expect(motion.vy).toBeLessThanOrEqual(-player.fastDropSpeed);
    run(motion, 0.3);
    expect(motion.isGrounded).toBe(true);
    expect(motion.isDucking).toBe(true);
  });

  it('ducking lowers the hitbox and up interrupts it with a jump', () => {
    const motion = new PlayerMotion();
    motion.perform('down');
    expect(motion.height).toBe(player.duckHeight);
    expect(motion.canPerform('up', false)).toBe(true);
    motion.perform('up');
    expect(motion.isDucking).toBe(false);
    expect(motion.vy).toBeGreaterThan(0);
  });

  it('dash needs a full meter, flies at roof height and lands invulnerable', () => {
    const motion = new PlayerMotion();
    expect(motion.canPerform('dash', false)).toBe(false);
    expect(motion.canPerform('dash', true)).toBe(true);
    motion.perform('dash');
    run(motion, thrust.dashRiseSec + 0.1);
    expect(motion.y).toBeCloseTo(thrust.dashAltitude, 1);
    expect(motion.isInvulnerable).toBe(true);
    run(motion, thrust.dashSec + 2);
    expect(motion.isGrounded).toBe(true);
    expect(motion.events).toEqual(expect.arrayContaining(['dashStart', 'dashEnd', 'land']));
  });

  it('bounces back to the previous lane after a side hit', () => {
    const motion = new PlayerMotion();
    motion.perform('right');
    run(motion, player.laneChangeSec / 2);
    motion.bounceBack();
    run(motion, player.laneChangeSec + DT);
    expect(motion.lane).toBe(1);
    expect(motion.x).toBeCloseTo(laneX(1));
  });
});
