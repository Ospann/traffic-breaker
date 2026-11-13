import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  SphereGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
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
  drift: Float32Array;
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
    drift: new Float32Array(count),
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

function advance(s: Scroller, distance: number, dt: number): void {
  for (let i = 0; i < s.mesh.count; i += 1) {
    let z = (s.z[i] ?? 0) + distance + (s.drift[i] ?? 0) * dt;
    if (z > NEAR_Z) z -= s.span;
    else if (z < NEAR_Z - s.span) z += s.span;
    s.z[i] = z;
  }
  writeScroller(s);
}

export class CityScenery {
  readonly root = new Group();
  private readonly scrollers: Scroller[] = [];
  private readonly sky = buildSky();

  constructor(windowTexture: Texture) {
    this.root.add(this.buildDeck());
    this.root.add(this.sky);
    this.root.add(this.buildUnderworld());
    this.buildBuildings(windowTexture);
    this.buildBillboards();
    this.buildFlyingTraffic();
    this.buildStreetTraffic();
    this.buildLamps();
    this.buildMarkings();
    for (const s of this.scrollers) {
      writeScroller(s);
      this.root.add(s.mesh);
    }
  }

  setViewDistance(distance: number): void {
    this.sky.scale.setScalar(Math.min(1, (distance + 25) / 190));
  }

  update(distance: number, dt: number): void {
    for (const s of this.scrollers) advance(s, distance, dt);
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
    const rows: BuildingRow[] = [
      { w: 12, h: 34, d: 12, count: 40, gap: 7, spread: 10, base: -40, lift: 6 },
      { w: 10, h: 60, d: 10, count: 40, gap: 16, spread: 30, base: -40, lift: 20 },
      { w: 16, h: 36, d: 14, count: 30, gap: 18, spread: 40, base: -40, lift: 20 },
      { w: 8, h: 90, d: 8, count: 24, gap: 24, spread: 40, base: -40, lift: 20 },
      { w: 24, h: 150, d: 20, count: 26, gap: 75, spread: 70, base: -50, lift: 30 },
    ];
    const tint = new Color();
    const tints = [0x9fb6ff, 0xffb3f2, 0xb8fff2, 0xffe2b0, 0xc8a8ff];
    const material = new MeshBasicMaterial({ map: windowTexture, color: 0xffffff });
    for (const row of rows) {
      const geometry = new BoxGeometry(row.w, row.h, row.d);
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i += 1) {
        uv.setXY(i, uv.getX(i) * (row.w / 8), uv.getY(i) * (row.h / 16));
      }
      const s = createScroller(geometry, material, row.count, CITY_SPAN);
      for (let i = 0; i < row.count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        s.x[i] = side * (ROAD_HALF_WIDTH + row.gap + row.w / 2 + random() * row.spread);
        s.y[i] = row.base + row.h / 2 + random() * row.lift;
        s.z[i] = NEAR_Z - ((i + random() * 0.8) / row.count) * CITY_SPAN;
        s.sy[i] = 0.8 + random() * 0.4;
        tint.setHex(tints[Math.floor(random() * tints.length)] ?? 0xffffff);
        tint.multiplyScalar(0.5 + random() * 0.5);
        s.mesh.setColorAt(i, tint);
      }
      this.scrollers.push(s);
    }
  }

  private buildBillboards(): void {
    const random = seeded(9);
    const count = 26;
    const s = createScroller(
      box(0.3, 1, 1),
      new MeshBasicMaterial({ color: 0xffffff }),
      count,
      CITY_SPAN,
    );
    const colors = [palette.magenta, palette.cyan, palette.amber, palette.lime, palette.violet];
    const tint = new Color();
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      s.x[i] = side * (ROAD_HALF_WIDTH + 6.6);
      s.y[i] = -6 + random() * 6;
      s.z[i] = NEAR_Z - ((i + random()) / count) * CITY_SPAN;
      s.sy[i] = 1.6 + random() * 2;
      s.sz[i] = 3 + random() * 4;
      tint.setHex(colors[Math.floor(random() * colors.length)] ?? palette.magenta);
      tint.multiplyScalar(0.35 + random() * 0.3);
      s.mesh.setColorAt(i, tint);
    }
    this.scrollers.push(s);
  }

  private buildFlyingTraffic(): void {
    const random = seeded(77);
    const count = 48;
    const b = new ModelBuilder();
    b.addGlow(box(0.7, 0.25, 1.8), 0xffffff);
    const geometry = b.buildGeometries().glow;
    if (!geometry) return;
    const s = createScroller(
      geometry,
      new MeshBasicMaterial({ color: 0xffffff }),
      count,
      CITY_SPAN,
    );
    const tint = new Color();
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const towardUs = random() < 0.5;
      s.x[i] = side * (ROAD_HALF_WIDTH + 8 + random() * 50);
      s.y[i] = 16 + Math.floor(random() * 4) * 6;
      s.z[i] = NEAR_Z - random() * CITY_SPAN;
      s.drift[i] = towardUs ? 20 + random() * 20 : -(10 + random() * 15);
      tint.setHex(towardUs ? 0xfff2d0 : palette.red);
      s.mesh.setColorAt(i, tint);
    }
    this.scrollers.push(s);
  }

  private buildStreetTraffic(): void {
    const random = seeded(5);
    const count = 60;
    const b = new ModelBuilder();
    b.addGlow(box(0.5, 0.3, 5), 0xffffff);
    const geometry = b.buildGeometries().glow;
    if (!geometry) return;
    const s = createScroller(
      geometry,
      new MeshBasicMaterial({ color: 0xffffff }),
      count,
      CITY_SPAN,
    );
    const tint = new Color();
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = Math.floor(random() * 4);
      const towardUs = lane % 2 === 0;
      s.x[i] = side * (ROAD_HALF_WIDTH + 4 + lane * 1.6);
      s.y[i] = -38.5;
      s.z[i] = NEAR_Z - random() * CITY_SPAN;
      s.drift[i] = towardUs ? 12 + random() * 8 : -(8 + random() * 8);
      tint.setHex(towardUs ? 0xfff2d0 : palette.red);
      s.mesh.setColorAt(i, tint);
    }
    this.scrollers.push(s);
  }

  private buildUnderworld(): Group {
    const b = new ModelBuilder();
    b.add(box(500, 1, CITY_SPAN + 200), 0x0d0718, { position: [0, -40, NEAR_Z - CITY_SPAN / 2] });
    for (const side of [-1, 1]) {
      b.add(box(9, 0.2, CITY_SPAN + 200), 0x181425, {
        position: [side * (ROAD_HALF_WIDTH + 6.4), -39.4, NEAR_Z - CITY_SPAN / 2],
      });
      b.addGlow(box(0.15, 0.05, CITY_SPAN + 200), side < 0 ? palette.cyan : palette.magenta, {
        position: [side * (ROAD_HALF_WIDTH + 1.9), -39.25, NEAR_Z - CITY_SPAN / 2],
      });
    }
    for (let z = NEAR_Z - 10; z > NEAR_Z - CITY_SPAN; z -= 60) {
      for (const side of [-1, 1]) {
        b.add(box(3, 38, 3), palette.concrete, { position: [side * 3, -21, z] });
      }
    }
    const group = b.build();
    for (const child of group.children) child.frustumCulled = false;
    return group;
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

interface BuildingRow {
  w: number;
  h: number;
  d: number;
  count: number;
  gap: number;
  spread: number;
  base: number;
  lift: number;
}

function buildSky(): Group {
  const group = new Group();
  const geometry = new SphereGeometry(190, 24, 12);
  const skyPositions = geometry.getAttribute('position');
  const colors = new Float32Array(skyPositions.count * 3);
  const top = new Color(0x04010c);
  const mid = new Color(0x1a0b33);
  const haze = new Color(0x4a1460);
  const c = new Color();
  for (let i = 0; i < skyPositions.count; i += 1) {
    const h = skyPositions.getY(i) / 190;
    if (h > 0.08) c.copy(mid).lerp(top, Math.min(1, (h - 0.08) / 0.5));
    else c.copy(haze).lerp(mid, Math.min(1, Math.abs(h - 0.02) / 0.1));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const sky = new Mesh(
    geometry,
    new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }),
  );
  sky.renderOrder = -10;
  group.add(sky);

  const moon = new Mesh(
    new CircleGeometry(9, 24),
    new MeshBasicMaterial({ color: 0xffd9f2, fog: false, depthWrite: false }),
  );
  moon.position.set(-60, 70, -150);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = -9;
  group.add(moon);

  const random = seeded(3);
  const starCount = 260;
  const stars = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const theta = random() * Math.PI * 2;
    const phi = 0.15 + random() * 1.2;
    stars[i * 3] = 180 * Math.cos(theta) * Math.cos(phi);
    stars[i * 3 + 1] = 180 * Math.sin(phi);
    stars[i * 3 + 2] = 180 * Math.sin(theta) * Math.cos(phi);
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(stars, 3));
  const points = new Points(
    starGeometry,
    new PointsMaterial({ color: 0xcfc8ff, size: 1.5, sizeAttenuation: false, fog: false }),
  );
  points.renderOrder = -9;
  group.add(points);
  for (const child of group.children) child.frustumCulled = false;
  return group;
}

export function buildBlobShadow(): Mesh {
  const geometry = box(1.9, 0.01, 4.2);
  const mesh = new Mesh(geometry, materials.shadow);
  mesh.position.y = 0.02;
  return mesh;
}
