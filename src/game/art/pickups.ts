import {
  AdditiveBlending,
  DynamicDrawUsage,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Group,
} from 'three';
import type { BonusType } from '../balance';
import { materials } from './materials';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box, cylinder, torus } from './shapes';

const GOLD = 0xffc63a;

export function buildCoinGeometry(): BufferGeometry {
  const b = new ModelBuilder();
  b.addGlow(cylinder(0.42, 0.1, 16), GOLD, { rotation: [Math.PI / 2, 0, 0] });
  b.addGlow(cylinder(0.3, 0.12, 16), 0xfff1b0, { rotation: [Math.PI / 2, 0, 0] });
  b.addGlow(box(0.08, 0.36, 0.14), 0xd98a12);
  const geometry = b.buildGeometries().glow;
  if (!geometry) throw new Error('Coin geometry is empty');
  return geometry;
}

export function buildCoinMesh(capacity: number): InstancedMesh {
  const mesh = new InstancedMesh(buildCoinGeometry(), materials.glow, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return mesh;
}

function halo(b: ModelBuilder, color: number): void {
  b.addGlow(torus(0.75, 0.05), color);
  b.addGlow(torus(0.62, 0.025), palette.white);
}

const bonusBuilders: Readonly<Record<BonusType, () => ModelBuilder>> = {
  fullTank: () => {
    const b = new ModelBuilder();
    halo(b, palette.amber);
    b.add(box(0.5, 0.7, 0.3), 0x2a2d3a);
    b.addGlow(box(0.4, 0.5, 0.32), palette.amber, { position: [0, -0.04, 0] });
    b.addGlow(box(0.2, 0.1, 0.2), palette.white, { position: [0, 0.4, 0] });
    b.addGlow(box(0.1, 0.32, 0.34), palette.white, { rotation: [0, 0, 0.5] });
    return b;
  },
  magnet: () => {
    const b = new ModelBuilder();
    halo(b, palette.red);
    b.addGlow(torus(0.26, 0.09, Math.PI), palette.red, {
      rotation: [0, 0, Math.PI],
      position: [0, 0.05, 0],
    });
    for (const x of [-0.26, 0.26]) {
      b.addGlow(box(0.18, 0.22, 0.18), palette.red, { position: [x, 0.16, 0] });
      b.addGlow(box(0.18, 0.12, 0.18), palette.white, { position: [x, 0.33, 0] });
    }
    return b;
  },
  double: () => {
    const b = new ModelBuilder();
    halo(b, palette.violet);
    b.addGlow(cylinder(0.3, 0.08, 14), GOLD, {
      position: [-0.12, 0.08, 0.05],
      rotation: [Math.PI / 2, 0, 0],
    });
    b.addGlow(cylinder(0.3, 0.08, 14), 0xfff1b0, {
      position: [0.12, -0.08, -0.05],
      rotation: [Math.PI / 2, 0, 0],
    });
    return b;
  },
  superJump: () => {
    const b = new ModelBuilder();
    halo(b, palette.lime);
    for (let i = 0; i < 3; i += 1) {
      b.addGlow(torus(0.2, 0.05), palette.lime, {
        position: [0, -0.3 + i * 0.16, 0],
        rotation: [Math.PI / 2, 0, 0],
      });
    }
    for (const side of [-1, 1]) {
      b.addGlow(box(0.34, 0.08, 0.08), palette.white, {
        position: [side * 0.11, 0.3, 0],
        rotation: [0, 0, side * -0.7],
      });
    }
    return b;
  },
};

export function buildBonus(type: BonusType): Group {
  return bonusBuilders[type]().build();
}

export function buildShieldBubble(): Mesh {
  const material = new MeshBasicMaterial({
    color: palette.cyan,
    transparent: true,
    opacity: 0.22,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new Mesh(new SphereGeometry(1, 20, 14), material);
  mesh.scale.set(1.45, 0.95, 2.6);
  mesh.position.y = 0.6;
  mesh.visible = false;
  return mesh;
}
