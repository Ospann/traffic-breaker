import type { Group } from 'three';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box, cylinder, loft, torus, type LoftSection } from './shapes';

export type CarKit = 'stock' | 'aero' | 'blade' | 'rally';

export interface CarSkin {
  body: number;
  neon: number;
  trim: number;
  kit: CarKit;
}

export const defaultCarSkin: CarSkin = {
  body: 0x3d63c9,
  neon: palette.cyan,
  trim: 0x15161f,
  kit: 'stock',
};

function addKit(b: ModelBuilder, skin: CarSkin): void {
  if (skin.kit === 'aero') {
    b.add(box(1.9, 0.05, 0.42), skin.trim, { position: [0, 1.12, 1.72], rotation: [-0.12, 0, 0] });
    for (const x of [-0.55, 0.55]) {
      b.add(box(0.06, 0.4, 0.18), skin.trim, { position: [x, 0.92, 1.72] });
    }
    for (const x of [-0.95, 0.95]) {
      b.add(box(0.04, 0.3, 0.44), skin.trim, { position: [x, 1.12, 1.72] });
    }
    b.add(box(1.7, 0.05, 0.32), skin.trim, { position: [0, 0.2, -2.02] });
    b.addGlow(box(1.88, 0.03, 0.04), skin.neon, { position: [0, 1.15, 1.5] });
    b.addGlow(box(1.6, 0.03, 0.04), skin.neon, { position: [0, 0.22, -2.17] });
  } else if (skin.kit === 'blade') {
    for (const side of [-1, 1]) {
      b.add(box(0.05, 0.42, 0.9), skin.trim, {
        position: [side * 0.82, 0.92, 1.35],
        rotation: [0.35, 0, 0],
      });
      b.addGlow(box(0.06, 0.04, 0.8), skin.neon, {
        position: [side * 0.82, 1.08, 1.4],
        rotation: [0.35, 0, 0],
      });
      b.add(box(0.12, 0.08, 1.6), skin.trim, { position: [side * 0.95, 0.3, -0.1] });
      b.addGlow(box(0.03, 0.03, 1.5), skin.neon, { position: [side * 1.01, 0.33, -0.1] });
      b.add(box(0.3, 0.04, 0.16), skin.trim, {
        position: [side * 0.72, 0.36, -1.85],
        rotation: [0, side * 0.3, side * 0.2],
      });
    }
  } else if (skin.kit === 'rally') {
    b.add(box(1.2, 0.08, 0.1), skin.trim, { position: [0, 1.0, 0.78] });
    for (let i = 0; i < 4; i += 1) {
      b.addGlow(box(0.18, 0.12, 0.06), 0xfff2c0, { position: [-0.42 + i * 0.28, 1.08, 0.72] });
    }
    b.add(box(1.5, 0.08, 0.08), skin.trim, { position: [0, 0.32, -2.06] });
    for (const x of [-0.55, 0.55]) {
      b.add(box(0.08, 0.3, 0.08), skin.trim, { position: [x, 0.42, -2.06] });
    }
    for (const side of [-1, 1]) {
      b.add(box(0.3, 0.28, 0.03), skin.trim, { position: [side * 0.72, 0.18, 1.62] });
    }
    b.addGlow(box(1.3, 0.04, 0.04), skin.neon, { position: [0, 0.42, -2.08] });
  }
}

export const carSockets = {
  rearNozzles: [
    [-0.3, 0.42, 2.02],
    [0.3, 0.42, 2.02],
  ],
  underNozzles: [
    [-0.5, 0.06, 0.55],
    [0.5, 0.06, 0.55],
  ],
} as const;

const BODY_WIDTH = 1.78;
const WHEEL_RADIUS = 0.36;
const WHEEL_Z = [-1.28, 1.22] as const;

const bodyKeys: readonly LoftSection[] = [
  { z: -2.02, halfWidth: 0.42, bottom: 0.3, top: 0.4, power: 2.2 },
  { z: -1.9, halfWidth: 0.72, bottom: 0.22, top: 0.5, power: 2.6 },
  { z: -1.55, halfWidth: 0.86, bottom: 0.2, top: 0.58, power: 3 },
  { z: -1.2, halfWidth: 0.9, bottom: 0.2, top: 0.63, power: 3.2 },
  { z: -0.7, halfWidth: 0.88, bottom: 0.2, top: 0.66, power: 3.2 },
  { z: 0.1, halfWidth: 0.88, bottom: 0.2, top: 0.68, power: 3.2 },
  { z: 0.8, halfWidth: 0.93, bottom: 0.2, top: 0.74, power: 3.2 },
  { z: 1.3, halfWidth: 0.95, bottom: 0.22, top: 0.8, power: 3 },
  { z: 1.75, halfWidth: 0.88, bottom: 0.26, top: 0.8, power: 2.8 },
  { z: 1.98, halfWidth: 0.72, bottom: 0.34, top: 0.72, power: 2.4 },
  { z: 2.04, halfWidth: 0.5, bottom: 0.42, top: 0.64, power: 2.2 },
];

const canopyKeys: readonly LoftSection[] = [
  { z: -0.78, halfWidth: 0.62, bottom: 0.45, top: 0.62, power: 2.4 },
  { z: -0.45, halfWidth: 0.64, bottom: 0.45, top: 0.88, power: 2.6 },
  { z: -0.05, halfWidth: 0.6, bottom: 0.45, top: 1.08, power: 2.8 },
  { z: 0.45, halfWidth: 0.58, bottom: 0.45, top: 1.1, power: 2.8 },
  { z: 0.9, halfWidth: 0.6, bottom: 0.45, top: 0.98, power: 2.6 },
  { z: 1.35, halfWidth: 0.62, bottom: 0.45, top: 0.8, power: 2.4 },
  { z: 1.55, halfWidth: 0.5, bottom: 0.45, top: 0.74, power: 2.2 },
];

const roofKeys: readonly LoftSection[] = [
  { z: -0.12, halfWidth: 0.5, bottom: 0.9, top: 1.1, power: 3 },
  { z: 0.2, halfWidth: 0.52, bottom: 0.9, top: 1.13, power: 3.2 },
  { z: 0.5, halfWidth: 0.5, bottom: 0.9, top: 1.12, power: 3 },
];

export function buildBreakerCar(skin: CarSkin = defaultCarSkin): Group {
  const b = new ModelBuilder();

  b.add(loft(bodyKeys, 30, 22), skin.body);
  b.add(loft(canopyKeys, 18, 18), palette.glass);
  b.add(loft(roofKeys, 6, 14), skin.trim);

  WHEEL_Z.forEach((wheelZ, index) => {
    const rear = index === 1;
    const top = rear ? 0.88 : 0.82;
    const halfWidth = rear ? 0.26 : 0.22;
    const fender = (): ReturnType<typeof loft> =>
      loft(
        [
          { z: wheelZ - 0.66, halfWidth: halfWidth * 0.5, bottom: 0.32, top: 0.5, power: 2.2 },
          { z: wheelZ - 0.35, halfWidth, bottom: 0.3, top: top - 0.04, power: 2.4 },
          { z: wheelZ, halfWidth, bottom: 0.3, top, power: 2.4 },
          { z: wheelZ + 0.35, halfWidth, bottom: 0.3, top: top - 0.04, power: 2.4 },
          { z: wheelZ + 0.66, halfWidth: halfWidth * 0.5, bottom: 0.32, top: 0.5, power: 2.2 },
        ],
        12,
        14,
      );
    for (const side of [-1, 1]) {
      b.add(fender(), skin.body, { position: [side * (BODY_WIDTH / 2 - halfWidth + 0.06), 0, 0] });
    }
  });

  for (const side of [-1, 1]) {
    b.addGlow(box(0.36, 0.03, 0.05), palette.white, {
      position: [side * 0.56, 0.47, -1.86],
      rotation: [0.15, side * 0.55, side * -0.18],
    });
    b.add(box(0.05, 0.16, 0.55), 0x0b0b12, { position: [side * 0.93, 0.47, 0.62] });
    b.addGlow(box(0.025, 0.025, 2.2), skin.neon, { position: [side * 0.9, 0.24, -0.15] });
  }
  b.addGlow(box(1.25, 0.03, 0.04), palette.red, { position: [0, 0.66, 2.0] });
  b.add(box(1.1, 0.1, 0.2), skin.trim, { position: [0, 0.3, 1.9] });

  for (const z of WHEEL_Z) {
    for (const side of [-1, 1]) {
      const x = side * (BODY_WIDTH / 2 - 0.01);
      b.add(cylinder(WHEEL_RADIUS, 0.28, 18), 0x0a0a10, {
        position: [x, WHEEL_RADIUS, z],
        rotation: [0, 0, Math.PI / 2],
      });
      b.add(cylinder(WHEEL_RADIUS * 0.68, 0.3, 14), 0x3a3d4a, {
        position: [x, WHEEL_RADIUS, z],
        rotation: [0, 0, Math.PI / 2],
      });
      for (let k = 0; k < 5; k += 1) {
        b.add(box(0.03, WHEEL_RADIUS * 1.2, 0.06), 0x8c90a0, {
          position: [x + side * 0.155, WHEEL_RADIUS, z],
          rotation: [(k / 5) * Math.PI, 0, 0],
        });
      }
      b.addGlow(torus(WHEEL_RADIUS * 0.7, 0.015), skin.neon, {
        position: [x + side * 0.16, WHEEL_RADIUS, z],
        rotation: [0, Math.PI / 2, 0],
      });
    }
  }

  for (const [x, y, z] of carSockets.rearNozzles) {
    b.add(cylinder(0.11, 0.2, 12), palette.metal, {
      position: [x, y, z - 0.08],
      rotation: [Math.PI / 2, 0, 0],
    });
    b.addGlow(cylinder(0.07, 0.03, 12), 0xcfefff, {
      position: [x, y, z + 0.03],
      rotation: [Math.PI / 2, 0, 0],
    });
  }
  for (const [x, y, z] of carSockets.underNozzles) {
    b.addGlow(cylinder(0.12, 0.03, 10), 0xcfefff, { position: [x, y + 0.12, z] });
  }

  addKit(b, skin);
  return b.build();
}
