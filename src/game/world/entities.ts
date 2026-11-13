export type ObstacleType =
  | 'lowBarrier'
  | 'midBarrier'
  | 'highSign'
  | 'truck'
  | 'bus'
  | 'oncoming'
  | 'cone'
  | 'hologram'
  | 'ramp';

export interface ObstacleSpec {
  length: number;
  halfWidth: number;
  y0: number;
  y1: number;
  solid: boolean;
  roof: boolean;
  slope: boolean;
  approachSpeed: number;
}

export const obstacleSpecs: Readonly<Record<ObstacleType, ObstacleSpec>> = {
  lowBarrier: {
    length: 0.6,
    halfWidth: 1.1,
    y0: 0,
    y1: 0.8,
    solid: true,
    roof: false,
    approachSpeed: 0,
    slope: false,
  },
  midBarrier: {
    length: 0.5,
    halfWidth: 1.1,
    y0: 0.75,
    y1: 1.4,
    solid: true,
    roof: false,
    approachSpeed: 0,
    slope: false,
  },
  highSign: {
    length: 0.9,
    halfWidth: 1.15,
    y0: 0.85,
    y1: 9,
    solid: true,
    roof: false,
    approachSpeed: 0,
    slope: false,
  },
  truck: {
    length: 12,
    halfWidth: 1.1,
    y0: 0,
    y1: 3.2,
    solid: true,
    roof: true,
    approachSpeed: 0,
    slope: false,
  },
  bus: {
    length: 10,
    halfWidth: 1.1,
    y0: 0,
    y1: 3,
    solid: true,
    roof: true,
    approachSpeed: 0,
    slope: false,
  },
  oncoming: {
    length: 4.2,
    halfWidth: 0.95,
    y0: 0,
    y1: 1.4,
    solid: true,
    roof: false,
    approachSpeed: 9,
    slope: false,
  },
  cone: {
    length: 0.5,
    halfWidth: 0.3,
    y0: 0,
    y1: 0.7,
    solid: false,
    roof: false,
    approachSpeed: 0,
    slope: false,
  },
  hologram: {
    length: 0.4,
    halfWidth: 1.2,
    y0: 0,
    y1: 3,
    solid: false,
    roof: false,
    approachSpeed: 0,
    slope: false,
  },
  ramp: {
    length: 7,
    halfWidth: 1.15,
    y0: 0,
    y1: 3.2,
    solid: true,
    roof: true,
    slope: true,
    approachSpeed: 0,
  },
};

export const obstacleTypes: readonly ObstacleType[] = [
  'lowBarrier',
  'midBarrier',
  'highSign',
  'truck',
  'bus',
  'oncoming',
  'cone',
  'hologram',
  'ramp',
];

export function isObstacleType(value: unknown): value is ObstacleType {
  return typeof value === 'string' && Object.hasOwn(obstacleSpecs, value);
}

export function surfaceHeight(spec: ObstacleSpec, along: number): number {
  if (!spec.slope) return spec.y1;
  return (Math.min(Math.max(along, 0), spec.length) / spec.length) * spec.y1;
}
