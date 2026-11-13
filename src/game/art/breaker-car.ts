import type { Group } from 'three';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box, cylinder, extrudeProfile, extrudeRotation } from './shapes';

export interface CarSkin {
  body: number;
  neon: number;
  trim: number;
}

export const defaultCarSkin: CarSkin = {
  body: 0x2b2244,
  neon: palette.cyan,
  trim: palette.darkMetal,
};

export const carSockets = {
  rearNozzles: [
    [-0.45, 0.42, 2.12],
    [0.45, 0.42, 2.12],
  ],
  underNozzles: [
    [-0.5, 0.06, 0.55],
    [0.5, 0.06, 0.55],
  ],
} as const;

const BODY_WIDTH = 1.66;
const CANOPY_WIDTH = 1.1;

export function buildBreakerCar(skin: CarSkin = defaultCarSkin): Group {
  const b = new ModelBuilder();

  b.add(
    extrudeProfile(
      [
        [1.95, 0.2],
        [1.95, 0.36],
        [1.0, 0.52],
        [0.25, 0.62],
        [-0.55, 0.66],
        [-1.3, 0.8],
        [-1.95, 0.72],
        [-1.9, 0.22],
      ],
      BODY_WIDTH,
    ),
    skin.body,
    { rotation: extrudeRotation, position: [-BODY_WIDTH / 2, 0, 0] },
  );
  b.add(
    extrudeProfile(
      [
        [1.0, 0.5],
        [0.15, 0.95],
        [-0.55, 0.93],
        [-1.05, 0.7],
        [-1.05, 0.6],
        [1.0, 0.46],
      ],
      CANOPY_WIDTH,
    ),
    palette.glass,
    { rotation: extrudeRotation, position: [-CANOPY_WIDTH / 2, 0, 0] },
  );

  b.add(box(1.75, 0.05, 0.36), skin.trim, { position: [0, 0.98, 1.65] });
  b.add(box(0.06, 0.2, 0.2), skin.trim, { position: [-0.6, 0.86, 1.65] });
  b.add(box(0.06, 0.2, 0.2), skin.trim, { position: [0.6, 0.86, 1.65] });
  b.add(box(1.7, 0.12, 3.6), skin.trim, { position: [0, 0.22, 0] });

  for (const x of [-0.82, 0.82]) {
    for (const z of [-1.25, 1.2]) {
      b.add(cylinder(0.33, 0.28, 12), palette.darkMetal, {
        position: [x, 0.33, z],
        rotation: [0, 0, Math.PI / 2],
      });
      b.addGlow(cylinder(0.12, 0.3, 8), skin.neon, {
        position: [x, 0.33, z],
        rotation: [0, 0, Math.PI / 2],
      });
    }
  }

  for (const [x, y, z] of carSockets.rearNozzles) {
    b.add(cylinder(0.18, 0.36, 10), palette.metal, {
      position: [x, y, z - 0.16],
      rotation: [Math.PI / 2, 0, 0],
    });
    b.addGlow(cylinder(0.12, 0.04, 10), palette.amber, {
      position: [x, y, z + 0.03],
      rotation: [Math.PI / 2, 0, 0],
    });
  }
  for (const [x, y, z] of carSockets.underNozzles) {
    b.addGlow(cylinder(0.17, 0.04, 10), skin.neon, { position: [x, y + 0.1, z] });
  }

  b.addGlow(box(0.04, 0.05, 3.3), skin.neon, { position: [-0.85, 0.3, 0] });
  b.addGlow(box(0.04, 0.05, 3.3), skin.neon, { position: [0.85, 0.3, 0] });
  b.addGlow(box(1.3, 0.05, 0.04), palette.white, { position: [0, 0.35, -1.96] });
  b.addGlow(box(1.5, 0.07, 0.04), palette.red, { position: [0, 0.66, 1.94] });
  b.addGlow(box(1.2, 0.03, 0.04), skin.neon, { position: [0, 0.6, -0.4] });

  return b.build();
}
