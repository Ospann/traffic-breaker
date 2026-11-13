import type Phaser from 'phaser';
import { gameConfig } from './config';

export function scenePhysics(): { physics?: Phaser.Types.Core.PhysicsConfig } {
  if (gameConfig.physics === 'matter') {
    return { physics: { default: 'matter', matter: { gravity: { x: 0, y: 1 }, debug: false } } };
  }
  if (gameConfig.physics === 'arcade') {
    return { physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } } };
  }
  return {};
}
