import type Phaser from 'phaser';
import { FONT_FAMILY } from '../keys';

export function addLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 48,
  color = '#ffffff',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, align: 'center' })
    .setOrigin(0.5);
}
