import { Shape, type Group } from 'three';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box, cylinder, extrudeSide, taperWidth, torus } from './shapes';

export interface CarSkin {
  body: number;
  neon: number;
  trim: number;
}

export const defaultCarSkin: CarSkin = {
  body: 0x3d63c9,
  neon: palette.cyan,
  trim: 0x15161f,
};

export const carSockets = {
  rearNozzles: [
    [-0.42, 0.4, 2.0],
    [0.42, 0.4, 2.0],
  ],
  underNozzles: [
    [-0.5, 0.06, 0.55],
    [0.5, 0.06, 0.55],
  ],
} as const;

const BODY_WIDTH = 1.78;
const WHEEL_RADIUS = 0.36;
const WHEEL_Z = [-1.28, 1.22] as const;

function bodyShape(): Shape {
  const s = new Shape();
  s.moveTo(-1.9, 0.24);
  s.lineTo(1.78, 0.22);
  s.bezierCurveTo(1.95, 0.22, 2.0, 0.3, 1.98, 0.38);
  s.bezierCurveTo(1.6, 0.47, 1.15, 0.56, 0.72, 0.6);
  s.lineTo(-0.62, 0.62);
  s.bezierCurveTo(-1.1, 0.66, -1.55, 0.76, -1.82, 0.74);
  s.bezierCurveTo(-1.96, 0.72, -1.98, 0.58, -1.95, 0.42);
  s.lineTo(-1.9, 0.24);
  return s;
}

function windshieldShape(): Shape {
  const s = new Shape();
  s.moveTo(0.78, 0.58);
  s.bezierCurveTo(0.5, 0.74, 0.25, 0.9, 0.1, 0.96);
  s.lineTo(-0.02, 0.95);
  s.bezierCurveTo(0.2, 0.8, 0.45, 0.66, 0.6, 0.58);
  s.lineTo(0.78, 0.58);
  return s;
}

function fenderShape(): Shape {
  const s = new Shape();
  s.moveTo(-0.55, 0.3);
  s.bezierCurveTo(-0.5, 0.78, 0.5, 0.78, 0.55, 0.3);
  s.lineTo(0.62, 0.24);
  s.lineTo(-0.62, 0.24);
  s.lineTo(-0.55, 0.3);
  return s;
}

function bodyTaper(z: number): number {
  if (z < -1.0) return 0.72 + 0.28 * Math.min(1, (z + 2.0) / 1.0);
  if (z > 1.3) return 1 - 0.1 * Math.min(1, (z - 1.3) / 0.7);
  return 1;
}

export function buildBreakerCar(skin: CarSkin = defaultCarSkin): Group {
  const b = new ModelBuilder();

  b.add(taperWidth(extrudeSide(bodyShape(), BODY_WIDTH, 0.14), bodyTaper), skin.body);

  for (const z of WHEEL_Z) {
    const fender = extrudeSide(fenderShape(), 0.34, 0.08);
    for (const x of [-BODY_WIDTH / 2 + 0.12, BODY_WIDTH / 2 - 0.12]) {
      b.add(fender.clone(), skin.body, { position: [x, 0, z] });
    }
    fender.dispose();
  }

  b.add(
    taperWidth(extrudeSide(windshieldShape(), 1.42, 0.05), (z) => 1 - Math.max(0, -z - 0.1) * 0.35),
    palette.glass,
  );
  b.addGlow(box(1.2, 0.03, 0.05), skin.neon, { position: [0, 0.96, -0.04] });

  b.add(box(1.36, 0.08, 1.25), skin.trim, { position: [0, 0.58, 0.05] });
  for (const x of [-0.36, 0.36]) {
    b.add(box(0.5, 0.42, 0.16), 0x262335, { position: [x, 0.84, 0.48], rotation: [0.25, 0, 0] });
    b.add(box(0.3, 0.16, 0.12), 0x262335, { position: [x, 1.1, 0.55], rotation: [0.25, 0, 0] });
    b.add(torus(0.19, 0.035, Math.PI), skin.trim, { position: [x, 0.72, 0.78] });
    b.add(box(0.5, 0.28, 0.44), skin.trim, { position: [x, 0.66, 0.2] });
  }
  b.add(box(0.12, 0.14, 0.75), skin.trim, { position: [0, 0.7, 0.0] });

  for (const z of WHEEL_Z) {
    for (const side of [-1, 1]) {
      const x = side * (BODY_WIDTH / 2 - 0.08);
      b.add(cylinder(WHEEL_RADIUS, 0.3, 16), 0x0c0c12, {
        position: [x, WHEEL_RADIUS, z],
        rotation: [0, 0, Math.PI / 2],
      });
      b.add(cylinder(WHEEL_RADIUS * 0.62, 0.32, 10), 0x5a5e6e, {
        position: [x, WHEEL_RADIUS, z],
        rotation: [0, 0, Math.PI / 2],
      });
      b.addGlow(torus(WHEEL_RADIUS * 0.66, 0.02), skin.neon, {
        position: [x + side * 0.165, WHEEL_RADIUS, z],
        rotation: [0, Math.PI / 2, 0],
      });
    }
  }

  for (const side of [-1, 1]) {
    b.addGlow(box(0.34, 0.035, 0.06), palette.white, {
      position: [side * 0.6, 0.43, -1.88],
      rotation: [0, side * 0.35, side * -0.12],
    });
    b.add(box(0.06, 0.1, 0.5), skin.trim, { position: [side * 0.87, 0.48, 0.75] });
    b.addGlow(box(0.03, 0.03, 2.4), skin.neon, { position: [side * 0.86, 0.27, -0.1] });
  }

  b.addGlow(box(1.5, 0.04, 0.04), palette.red, { position: [0, 0.66, 1.95] });
  b.add(box(1.4, 0.18, 0.2), skin.trim, { position: [0, 0.32, 1.86] });
  for (const [x, y, z] of carSockets.rearNozzles) {
    b.add(cylinder(0.15, 0.3, 12), palette.metal, {
      position: [x, y, z - 0.14],
      rotation: [Math.PI / 2, 0, 0],
    });
    b.addGlow(cylinder(0.1, 0.04, 12), palette.amber, {
      position: [x, y, z + 0.02],
      rotation: [Math.PI / 2, 0, 0],
    });
  }
  for (const [x, y, z] of carSockets.underNozzles) {
    b.addGlow(cylinder(0.17, 0.04, 10), skin.neon, { position: [x, y + 0.12, z] });
  }

  return b.build();
}
