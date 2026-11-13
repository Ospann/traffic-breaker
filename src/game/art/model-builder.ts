import {
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials } from './materials';

export interface PartTransform {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

const tmpColor = new Color();

function prepare(
  geometry: BufferGeometry,
  color: number,
  transform: PartTransform,
): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  if (source !== geometry) geometry.dispose();
  source.deleteAttribute('uv');
  const matrix = new Matrix4().compose(
    new Vector3(...(transform.position ?? [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...(transform.rotation ?? [0, 0, 0]))),
    new Vector3(...(transform.scale ?? [1, 1, 1])),
  );
  source.applyMatrix4(matrix);
  tmpColor.setHex(color);
  const count = source.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  source.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return source;
}

export class ModelBuilder {
  private readonly solid: BufferGeometry[] = [];
  private readonly glow: BufferGeometry[] = [];

  add(geometry: BufferGeometry, color: number, transform: PartTransform = {}): this {
    this.solid.push(prepare(geometry, color, transform));
    return this;
  }

  addGlow(geometry: BufferGeometry, color: number, transform: PartTransform = {}): this {
    this.glow.push(prepare(geometry, color, transform));
    return this;
  }

  buildGeometries(): { solid: BufferGeometry | null; glow: BufferGeometry | null } {
    return { solid: merge(this.solid), glow: merge(this.glow) };
  }

  build(solidMaterial: Material = materials.body, glowMaterial: Material = materials.glow): Group {
    const group = new Group();
    const { solid, glow } = this.buildGeometries();
    if (solid) group.add(new Mesh(solid, solidMaterial));
    if (glow) group.add(new Mesh(glow, glowMaterial));
    return group;
  }
}

function merge(parts: BufferGeometry[]): BufferGeometry | null {
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('Failed to merge model geometry');
  merged.computeBoundingSphere();
  return merged;
}
