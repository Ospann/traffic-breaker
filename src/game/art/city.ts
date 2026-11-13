import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type MeshLambertMaterial,
  type Texture,
} from 'three';
import { LANE_WIDTH, LANES } from '../balance';
import { materials } from './materials';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box } from './shapes';

export const ROAD_HALF_WIDTH = (LANES * LANE_WIDTH) / 2 + 0.9;
export const CITY_SPAN = 360;
const NEAR_Z = 30;

interface Scroller {
  mesh: InstancedMesh;
  z: Float32Array;
  x: Float32Array;
  y: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  ry: Float32Array;
  span: number;
}

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const rotation = new Quaternion();
const up = new Vector3(0, 1, 0);

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state / 0x100000000;
  };
}

function createScroller(
  geometry: BufferGeometry,
  material: MeshBasicMaterial | MeshLambertMaterial,
  count: number,
  span: number,
): Scroller {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  return {
    mesh,
    z: new Float32Array(count),
    x: new Float32Array(count),
    y: new Float32Array(count),
    sx: new Float32Array(count).fill(1),
    sy: new Float32Array(count).fill(1),
    sz: new Float32Array(count).fill(1),
    ry: new Float32Array(count),
    span,
  };
}

function writeScroller(s: Scroller): void {
  for (let i = 0; i < s.mesh.count; i += 1) {
    position.set(s.x[i] ?? 0, s.y[i] ?? 0, s.z[i] ?? 0);
    scale.set(s.sx[i] ?? 1, s.sy[i] ?? 1, s.sz[i] ?? 1);
    rotation.setFromAxisAngle(up, s.ry[i] ?? 0);
    matrix.compose(position, rotation, scale);
    s.mesh.setMatrixAt(i, matrix);
  }
  s.mesh.instanceMatrix.needsUpdate = true;
}

function advance(s: Scroller, distance: number): void {
  for (let i = 0; i < s.mesh.count; i += 1) {
    let z = (s.z[i] ?? 0) + distance;
    if (z > NEAR_Z) z -= s.span;
    s.z[i] = z;
  }
  writeScroller(s);
}

export class CityScenery {
  readonly root = new Group();
  private readonly scrollers: Scroller[] = [];

  constructor(windowTexture: Texture) {
    this.root.add(this.buildDeck());
    this.buildBuildings(windowTexture);
    this.buildLamps();
    this.buildMarkings();
    for (const s of this.scrollers) {
      writeScroller(s);
      this.root.add(s.mesh);
    }
  }

  update(distance: number): void {
    for (const s of this.scrollers) advance(s, distance);
  }

  private buildDeck(): Group {
    const length = CITY_SPAN;
    const b = new ModelBuilder();
    const w = ROAD_HALF_WIDTH * 2;
    b.add(box(w, 0.4, length), palette.asphalt, { position: [0, -0.2, NEAR_Z - length / 2] });
    b.add(box(w + 1.2, 1.6, length), palette.concrete, {
      position: [0, -1.2, NEAR_Z - length / 2],
    });
    for (const side of [-1, 1]) {
      const x = side * (ROAD_HALF_WIDTH + 0.2);
      b.add(box(0.4, 0.9, length), palette.metal, { position: [x, 0.45, NEAR_Z - length / 2] });
      b.addGlow(box(0.06, 0.06, length), side < 0 ? palette.magenta : palette.cyan, {
        position: [x - side * 0.21, 0.75, NEAR_Z - length / 2],
      });
      b.addGlow(box(0.08, 0.04, length), side < 0 ? palette.magenta : palette.cyan, {
        position: [x + side * 0.4, -1.95, NEAR_Z - length / 2],
      });
      b.addGlow(box(0.1, 0.02, length), palette.white, {
        position: [side * (ROAD_HALF_WIDTH - 0.6), 0.01, NEAR_Z - length / 2],
      });
    }
    const deck = b.build();
    for (const child of deck.children) child.frustumCulled = false;
    return deck;
  }

  private buildBuildings(windowTexture: Texture): void {
    const random = seeded(42);
    const variants: [number, number, number, number][] = [
      [10, 60, 10, 40],
      [16, 36, 14, 30],
      [8, 90, 8, 24],
    ];
    const tint = new Color();
    const tints = [0x9fb6ff, 0xffb3f2, 0xb8fff2, 0xffe2b0];
    for (const [w, h, d, count] of variants) {
      const geometry = new BoxGeometry(w, h, d);
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i += 1) {
        uv.setXY(i, uv.getX(i) * (w / 8), uv.getY(i) * (h / 16));
      }
      const material = new MeshBasicMaterial({ map: windowTexture, color: 0xffffff });
      const s = createScroller(geometry, material, count, CITY_SPAN);
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        s.x[i] = side * (ROAD_HALF_WIDTH + 10 + w / 2 + random() * 40);
        s.y[i] = -40 + h / 2 + random() * 20;
        s.z[i] = NEAR_Z - random() * CITY_SPAN;
        s.sy[i] = 0.85 + random() * 0.3;
        tint.setHex(tints[Math.floor(random() * tints.length)] ?? 0xffffff);
        tint.multiplyScalar(0.55 + random() * 0.45);
        s.mesh.setColorAt(i, tint);
      }
      this.scrollers.push(s);
    }
  }

  private buildLamps(): void {
    const spacing = 30;
    const count = Math.floor(CITY_SPAN / spacing) * 2;
    const pole = new ModelBuilder();
    pole.add(box(0.2, 7, 0.2), palette.metal, { position: [0, 3.5, 0] });
    pole.add(box(2.2, 0.16, 0.25), palette.metal, { position: [-1.0, 7, 0] });
    const poleGeometry = pole.buildGeometries().solid;
    const head = new ModelBuilder();
    head.addGlow(box(1.0, 0.1, 0.35), 0xfff0d0, { position: [-1.7, 6.9, 0] });
    const headGeometry = head.buildGeometries().glow;
    if (!poleGeometry || !headGeometry) return;
    const poles = createScroller(poleGeometry, materials.body, count, CITY_SPAN);
    const heads = createScroller(headGeometry, materials.glow, count, CITY_SPAN);
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = NEAR_Z - Math.floor(i / 2) * spacing - (side > 0 ? spacing / 2 : 0);
      for (const s of [poles, heads]) {
        s.x[i] = side * (ROAD_HALF_WIDTH + 0.3);
        s.z[i] = z;
        s.ry[i] = side < 0 ? Math.PI : 0;
      }
    }
    this.scrollers.push(poles, heads);
  }

  private buildMarkings(): void {
    const spacing = 9;
    const perLine = Math.floor(CITY_SPAN / spacing);
    const lines = LANES - 1;
    const dash = new ModelBuilder();
    dash.addGlow(box(0.12, 0.02, 3), 0x9aa3c8);
    const geometry = dash.buildGeometries().glow;
    if (!geometry) return;
    const s = createScroller(geometry, materials.glow, perLine * lines, CITY_SPAN);
    for (let l = 0; l < lines; l += 1) {
      const x = (l + 1 - LANES / 2) * LANE_WIDTH;
      for (let i = 0; i < perLine; i += 1) {
        const index = l * perLine + i;
        s.x[index] = x;
        s.y[index] = 0.01;
        s.z[index] = NEAR_Z - i * spacing;
      }
    }
    this.scrollers.push(s);
  }
}

export function buildBlobShadow(): Mesh {
  const geometry = box(1.9, 0.01, 4.2);
  const mesh = new Mesh(geometry, materials.shadow);
  mesh.position.y = 0.02;
  return mesh;
}
