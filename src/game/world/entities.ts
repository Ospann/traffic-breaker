export type ObstacleType =
  | 'lowBarrier'
  | 'midBarrier'
  | 'highSign'
  | 'truck'
  | 'bus'
  | 'oncoming'
  | 'cone'
  | 'hologram';

export interface ObstacleSpec {
  length: number;
  halfWidth: number;
  y0: number;
  y1: number;
  solid: boolean;
  roof: boolean;
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
  },
  midBarrier: {
    length: 0.5,
    halfWidth: 1.1,
    y0: 0.75,
    y1: 1.4,
    solid: true,
    roof: false,
    approachSpeed: 0,
  },
  highSign: {
    length: 0.9,
    halfWidth: 1.15,
    y0: 0.85,
    y1: 9,
    solid: true,
    roof: false,
    approachSpeed: 0,
  },
  truck: { length: 12, halfWidth: 1.1, y0: 0, y1: 3.2, solid: true, roof: true, approachSpeed: 0 },
  bus: { length: 10, halfWidth: 1.1, y0: 0, y1: 3, solid: true, roof: true, approachSpeed: 0 },
  oncoming: {
    length: 4.2,
    halfWidth: 0.95,
    y0: 0,
    y1: 1.4,
    solid: true,
    roof: false,
    approachSpeed: 9,
  },
  cone: {
    length: 0.5,
    halfWidth: 0.3,
    y0: 0,
    y1: 0.7,
    solid: false,
    roof: false,
    approachSpeed: 0,
  },
  hologram: {
    length: 0.4,
    halfWidth: 1.2,
    y0: 0,
    y1: 3,
    solid: false,
    roof: false,
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
];

export function isObstacleType(value: unknown): value is ObstacleType {
  return typeof value === 'string' && Object.hasOwn(obstacleSpecs, value);
}
