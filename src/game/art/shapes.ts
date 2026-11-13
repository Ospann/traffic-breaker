import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  TorusGeometry,
} from 'three';

export function box(w: number, h: number, d: number): BufferGeometry {
  return new BoxGeometry(w, h, d);
}

export function cylinder(radius: number, length: number, segments = 10): BufferGeometry {
  return new CylinderGeometry(radius, radius, length, segments);
}

export function sideProfile(points: readonly (readonly [number, number])[]): Shape {
  const shape = new Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

export function extrudeProfile(
  points: readonly (readonly [number, number])[],
  width: number,
): BufferGeometry {
  return new ExtrudeGeometry(sideProfile(points), { depth: width, bevelEnabled: false });
}

export const extrudeRotation: [number, number, number] = [0, Math.PI / 2, 0];

export function torus(radius: number, tube: number, arc = Math.PI * 2): BufferGeometry {
  return new TorusGeometry(radius, tube, 6, 16, arc);
}

export function extrudeSide(shape: Shape, width: number, bevel: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(width - bevel * 2, 0.01),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.6,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-(width - bevel * 2) / 2, 0, 0);
  return geometry;
}

export function taperWidth(
  geometry: BufferGeometry,
  scaleAt: (z: number) => number,
): BufferGeometry {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    position.setX(i, position.getX(i) * scaleAt(position.getZ(i)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export interface LoftSection {
  z: number;
  halfWidth: number;
  bottom: number;
  top: number;
  power?: number;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function sampleSections(keys: readonly LoftSection[], count: number): LoftSection[] {
  const out: LoftSection[] = [];
  const spans = keys.length - 1;
  for (let i = 0; i < count; i += 1) {
    const u = (i / (count - 1)) * spans;
    const seg = Math.min(Math.floor(u), spans - 1);
    const t = u - seg;
    const k0 = keys[Math.max(seg - 1, 0)];
    const k1 = keys[seg];
    const k2 = keys[seg + 1];
    const k3 = keys[Math.min(seg + 2, spans)];
    if (!k0 || !k1 || !k2 || !k3) continue;
    const pick = (f: (s: LoftSection) => number): number => catmull(f(k0), f(k1), f(k2), f(k3), t);
    out.push({
      z: pick((s) => s.z),
      halfWidth: Math.max(
        pick((s) => s.halfWidth),
        0.01,
      ),
      bottom: pick((s) => s.bottom),
      top: pick((s) => s.top),
      power: pick((s) => s.power ?? 2.6),
    });
  }
  return out;
}

export function loft(keys: readonly LoftSection[], sections = 28, radial = 20): BufferGeometry {
  const rings = sampleSections(keys, sections);
  const positions: number[] = [];
  const indices: number[] = [];
  for (const ring of rings) {
    const cy = (ring.top + ring.bottom) / 2;
    const hh = (ring.top - ring.bottom) / 2;
    const e = 2 / (ring.power ?? 2.6);
    for (let j = 0; j < radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** e * ring.halfWidth;
      const y = cy + Math.sign(s) * Math.abs(s) ** e * hh;
      positions.push(x, y, ring.z);
    }
  }
  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      indices.push(a, c, b, b, c, d);
    }
  }
  const capStart = positions.length / 3;
  const first = rings[0];
  const last = rings[rings.length - 1];
  if (first && last) {
    positions.push(0, (first.top + first.bottom) / 2, first.z);
    positions.push(0, (last.top + last.bottom) / 2, last.z);
    const lastRing = (rings.length - 1) * radial;
    for (let j = 0; j < radial; j += 1) {
      const next = (j + 1) % radial;
      indices.push(capStart, j, next);
      indices.push(capStart + 1, lastRing + next, lastRing + j);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
