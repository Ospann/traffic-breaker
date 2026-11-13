import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, type BufferGeometry } from 'three';

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
