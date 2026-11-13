import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  TorusGeometry,
  type BufferGeometry,
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
