import { ConeGeometry, Mesh, MeshBasicMaterial, type Group } from 'three';
import { materials } from './materials';
import { ModelBuilder } from './model-builder';
import { palette } from './palette';
import { box, cylinder } from './shapes';

export interface DroneModel {
  root: Group;
  sirenRed: Mesh;
  sirenBlue: Mesh;
  beam: Mesh;
}

export function buildPoliceDrone(): DroneModel {
  const b = new ModelBuilder();
  b.add(box(1.1, 0.35, 1.4), palette.metal);
  b.add(box(0.7, 0.2, 0.8), palette.white, { position: [0, 0.25, 0] });
  for (const [x, z] of [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ] as const) {
    b.add(box(0.12, 0.08, 1.1), palette.darkMetal, {
      position: [x / 2, 0, z / 2],
      rotation: [0, Math.atan2(x, z), 0],
    });
    b.add(cylinder(0.08, 0.2, 6), palette.darkMetal, { position: [x, 0.1, z] });
    b.addGlow(cylinder(0.45, 0.02, 14), 0x335577, { position: [x, 0.22, z] });
  }
  b.addGlow(box(1.12, 0.05, 0.05), palette.white, { position: [0, -0.1, -0.7] });
  b.addGlow(cylinder(0.16, 0.08, 10), palette.white, { position: [0, -0.2, -0.2] });
  const root = b.build();

  const sirenRed = new Mesh(box(0.3, 0.12, 0.3), new MeshBasicMaterial({ color: palette.red }));
  sirenRed.position.set(-0.22, 0.4, 0);
  const sirenBlue = new Mesh(box(0.3, 0.12, 0.3), new MeshBasicMaterial({ color: palette.blue }));
  sirenBlue.position.set(0.22, 0.4, 0);

  const cone = new ConeGeometry(1.4, 5, 16, 1, true);
  cone.translate(0, -2.5, 0);
  const beam = new Mesh(cone, materials.beam);
  beam.position.set(0, -0.2, -0.2);
  beam.rotation.x = 0.8;

  root.add(sirenRed, sirenBlue, beam);
  return { root, sirenRed, sirenBlue, beam };
}
