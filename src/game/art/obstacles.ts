import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Group,
} from 'three';
import { obstacleSpecs, type ObstacleType } from '../world/entities';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box, cylinder, extrudeProfile, extrudeRotation } from './shapes';

export interface ObstacleModel {
  root: Group;
  flicker: MeshBasicMaterial | null;
}

function lowBarrier(): ModelBuilder {
  const { halfWidth } = obstacleSpecs.lowBarrier;
  const w = halfWidth * 2;
  const b = new ModelBuilder();
  b.add(
    extrudeProfile(
      [
        [0.3, 0],
        [0.3, 0.2],
        [0.1, 0.45],
        [0.1, 0.8],
        [-0.1, 0.8],
        [-0.1, 0.45],
        [-0.3, 0.2],
        [-0.3, 0],
      ],
      w,
    ),
    palette.concrete,
    { rotation: extrudeRotation, position: [-w / 2, 0, 0] },
  );
  for (let i = 0; i < 4; i += 1) {
    b.addGlow(box(0.28, 0.12, 0.03), i % 2 === 0 ? palette.amber : palette.darkMetal, {
      position: [-0.75 + i * 0.5, 0.6, 0.13],
      rotation: [0, 0, 0.5],
    });
  }
  b.addGlow(box(w, 0.04, 0.04), palette.amber, { position: [0, 0.82, 0] });
  return b;
}

function midBarrier(): ModelBuilder {
  const { halfWidth, y0, y1 } = obstacleSpecs.midBarrier;
  const w = halfWidth * 2;
  const h = y1 - y0;
  const b = new ModelBuilder();
  b.add(box(w, h, 0.35), palette.metal, { position: [0, y0 + h / 2, 0] });
  for (let i = 0; i < 5; i += 1) {
    b.addGlow(box(0.24, h * 0.7, 0.03), i % 2 === 0 ? palette.orange : palette.white, {
      position: [-0.88 + i * 0.44, y0 + h / 2, 0.19],
      rotation: [0, 0, 0.6],
    });
  }
  for (const x of [-halfWidth - 0.06, halfWidth + 0.06]) {
    b.add(box(0.1, y1 + 0.2, 0.1), palette.darkMetal, { position: [x, (y1 + 0.2) / 2, 0] });
    b.addGlow(box(0.12, 0.12, 0.12), palette.red, { position: [x, y1 + 0.26, 0] });
  }
  return b;
}

function highSign(): ModelBuilder {
  const { halfWidth, y0 } = obstacleSpecs.highSign;
  const w = halfWidth * 2;
  const b = new ModelBuilder();
  for (let i = 0; i < 3; i += 1) {
    b.add(cylinder(0.24, w, 10), i === 1 ? palette.metal : palette.concrete, {
      position: [0, y0 + 0.24 + i * 0.44, (i - 1) * 0.12],
      rotation: [0, 0, Math.PI / 2],
    });
  }
  b.add(box(w + 0.2, 2.4, 0.3), palette.darkMetal, { position: [0, y0 + 2.6, 0] });
  b.add(box(w + 0.6, 0.4, 0.5), palette.metal, { position: [0, 5.6, 0] });
  for (const x of [-halfWidth - 0.15, halfWidth + 0.15]) {
    b.add(box(0.2, 5.6, 0.2), palette.metal, { position: [x, 2.8, 0] });
  }
  b.addGlow(box(w, 0.06, 0.06), palette.magenta, { position: [0, y0 - 0.02, 0.22] });
  b.addGlow(box(w * 0.8, 0.5, 0.04), palette.magenta, { position: [0, y0 + 2.4, 0.17] });
  b.addGlow(box(w * 0.5, 0.18, 0.04), palette.white, { position: [0, y0 + 3.0, 0.17] });
  return b;
}

function trailer(type: 'truck' | 'bus'): ModelBuilder {
  const spec = obstacleSpecs[type];
  const w = spec.halfWidth * 2;
  const len = spec.length;
  const h = spec.y1;
  const b = new ModelBuilder();
  if (type === 'truck') {
    b.add(box(w, h - 0.5, len - 2.4), 0x3a2f55, { position: [0, 0.5 + (h - 0.5) / 2, 1.2] });
    b.add(box(w, 2.4, 2.2), 0x252034, { position: [0, 0.4 + 1.2, -len / 2 + 1.1] });
    b.add(box(w - 0.1, 0.4, len), palette.darkMetal, { position: [0, 0.3, 0] });
    b.addGlow(box(0.06, 0.06, len - 2.4), palette.magenta, { position: [-w / 2, h, 1.2] });
    b.addGlow(box(0.06, 0.06, len - 2.4), palette.magenta, { position: [w / 2, h, 1.2] });
    b.addGlow(box(0.05, 0.05, len - 2.4), palette.cyan, { position: [-w / 2 - 0.01, 1.2, 1.2] });
    b.addGlow(box(0.05, 0.05, len - 2.4), palette.cyan, { position: [w / 2 + 0.01, 1.2, 1.2] });
    b.addGlow(box(w - 0.3, 0.06, 0.04), palette.red, { position: [0, 0.75, len / 2 + 0.01] });
    b.addGlow(box(0.05, h - 1.0, 0.04), palette.white, {
      position: [0, 0.6 + (h - 1) / 2, len / 2 + 0.01],
    });
  } else {
    b.add(box(w, h - 0.3, len), 0x1f3b4a, { position: [0, 0.3 + (h - 0.3) / 2, 0] });
    b.addGlow(box(w + 0.02, 0.5, len - 1.5), 0x1d8fb0, { position: [0, h - 0.95, 0] });
    b.addGlow(box(0.06, 0.06, len), palette.lime, { position: [-w / 2, h, 0] });
    b.addGlow(box(0.06, 0.06, len), palette.lime, { position: [w / 2, h, 0] });
    b.addGlow(box(w - 0.3, 0.1, 0.04), palette.red, { position: [0, 0.8, len / 2 + 0.01] });
    b.addGlow(box(w - 0.6, 0.6, 0.04), 0x1d8fb0, { position: [0, h - 0.95, len / 2 + 0.01] });
  }
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) {
    for (const z of [len / 2 - 1.3, len / 2 - 2.4, -len / 2 + 1.4]) {
      b.add(cylinder(0.42, 0.3, 10), palette.darkMetal, {
        position: [x, 0.42, z],
        rotation: [0, 0, Math.PI / 2],
      });
    }
  }
  return b;
}

function oncoming(): ModelBuilder {
  const spec = obstacleSpecs.oncoming;
  const w = spec.halfWidth * 2;
  const b = new ModelBuilder();
  b.add(
    extrudeProfile(
      [
        [-2.1, 0.25],
        [-2.1, 0.7],
        [-1.2, 0.78],
        [-0.6, 1.35],
        [0.9, 1.35],
        [1.5, 0.82],
        [2.1, 0.72],
        [2.1, 0.25],
      ],
      w,
    ),
    0x40304a,
    { rotation: extrudeRotation, position: [-w / 2, 0, 0] },
  );
  b.add(box(w - 0.2, 0.5, 1.4), palette.glass, { position: [0, 1.05, 0.0] });
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    for (const z of [-1.35, 1.35]) {
      b.add(cylinder(0.34, 0.24, 10), palette.darkMetal, {
        position: [x, 0.34, z],
        rotation: [0, 0, Math.PI / 2],
      });
    }
    b.addGlow(box(0.45, 0.14, 0.05), 0xfff2c0, { position: [x * 0.75, 0.62, 2.12] });
  }
  b.addGlow(box(w - 0.4, 0.04, 0.05), palette.white, { position: [0, 0.48, 2.12] });
  b.addGlow(box(w, 0.04, 0.04), palette.orange, { position: [0, 0.82, -2.1] });
  return b;
}

function cone(): ModelBuilder {
  const b = new ModelBuilder();
  b.add(box(0.5, 0.06, 0.5), palette.darkMetal, { position: [0, 0.03, 0] });
  b.add(cylinderCone(), palette.orange, { position: [0, 0.36, 0] });
  b.addGlow(cylinder(0.15, 0.08, 8), palette.white, { position: [0, 0.42, 0] });
  return b;
}

function cylinderCone(): ReturnType<typeof cylinder> {
  const geometry = cylinder(0.2, 0.62, 8);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    const k = 1 - (y + 0.31) / 0.62;
    position.setX(i, position.getX(i) * (0.2 + k * 0.9));
    position.setZ(i, position.getZ(i) * (0.2 + k * 0.9));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function hologram(): ObstacleModel {
  const b = new ModelBuilder();
  for (const x of [-1.25, 1.25]) {
    b.add(box(0.12, 0.3, 0.12), palette.darkMetal, { position: [x, 0.15, 0] });
    b.addGlow(box(0.05, 3, 0.05), palette.violet, { position: [x, 1.6, 0] });
  }
  const root = b.build();
  const material = new MeshBasicMaterial({
    color: palette.magenta,
    transparent: true,
    opacity: 0.32,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
  const panel = new Mesh(new PlaneGeometry(2.4, 2.6), material);
  panel.position.set(0, 1.7, 0);
  root.add(panel);
  return { root, flicker: material };
}

function rampModel(): ModelBuilder {
  const spec = obstacleSpecs.ramp;
  const w = spec.halfWidth * 2;
  const half = spec.length / 2;
  const angle = Math.atan2(spec.y1, spec.length);
  const deckLength = Math.hypot(spec.length, spec.y1);
  const b = new ModelBuilder();
  b.add(
    extrudeProfile(
      [
        [-half, 0],
        [half, spec.y1],
        [half, spec.y1 - 0.25],
        [-half + 0.5, 0],
      ],
      w,
    ),
    0x3b3f52,
    { rotation: extrudeRotation, position: [-w / 2, 0, 0] },
  );
  b.add(box(w - 0.2, spec.y1 - 0.5, 2.6), 0x2a2238, {
    position: [0, (spec.y1 - 0.5) / 2, -half + 1.3],
  });
  b.add(box(w - 0.4, 1.4, 1.6), 0x2a2238, { position: [0, 0.7, -half + 3.4] });
  for (const z of [-half + 0.6, -half + 2.2]) {
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
      b.add(cylinder(0.42, 0.3, 10), palette.darkMetal, {
        position: [x, 0.42, z],
        rotation: [0, 0, Math.PI / 2],
      });
    }
  }
  for (const side of [-1, 1]) {
    b.addGlow(box(0.07, 0.07, deckLength), palette.amber, {
      position: [side * (w / 2 - 0.03), spec.y1 / 2 + 0.04, 0],
      rotation: [angle, 0, 0],
    });
  }
  for (let i = 0; i < 4; i += 1) {
    const t = (i + 0.5) / 4;
    const z = half - t * spec.length;
    for (const side of [-1, 1]) {
      b.addGlow(box(0.75, 0.03, 0.14), palette.amber, {
        position: [side * 0.35, t * spec.y1 + 0.03, z],
        rotation: [angle, side * 0.6, 0],
      });
    }
  }
  b.addGlow(box(w, 0.06, 0.06), palette.red, { position: [0, spec.y1 + 0.02, -half] });
  return b;
}

const solid = (builder: () => ModelBuilder) => (): ObstacleModel => ({
  root: builder().build(),
  flicker: null,
});

const builders: Readonly<Record<ObstacleType, () => ObstacleModel>> = {
  lowBarrier: solid(lowBarrier),
  midBarrier: solid(midBarrier),
  highSign: solid(highSign),
  truck: solid(() => trailer('truck')),
  bus: solid(() => trailer('bus')),
  oncoming: solid(oncoming),
  cone: solid(cone),
  hologram,
  ramp: solid(rampModel),
};

export function buildObstacle(type: ObstacleType): ObstacleModel {
  return builders[type]();
}
