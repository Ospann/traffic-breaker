import { AdditiveBlending, DoubleSide, MeshBasicMaterial, MeshLambertMaterial } from 'three';

export const materials = {
  body: new MeshLambertMaterial({ vertexColors: true }),
  glow: new MeshBasicMaterial({ vertexColors: true }),
  beam: new MeshBasicMaterial({
    color: 0xbfe8ff,
    transparent: true,
    opacity: 0.16,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  }),
  shadow: new MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }),
};
