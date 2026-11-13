import { LANES } from '../balance';
import { isObstacleType, type ObstacleType } from '../world/entities';

export type Difficulty = 1 | 2 | 3;

export interface PatternObstacle {
  type: ObstacleType;
  lane: number;
  z: number;
  offsetX?: number;
}

export type PatternCoins =
  | { kind: 'line'; lane: number; z: number; count: number; spacing?: number; y?: number }
  | { kind: 'arc'; lane: number; z: number; count: number; length: number; height: number };

export interface Pattern {
  id: string;
  length: number;
  difficulty: Difficulty;
  tags: string[];
  obstacles: PatternObstacle[];
  coins: PatternCoins[];
}

function fail(id: string, message: string): never {
  throw new Error(`Pattern "${id}": ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLane(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < LANES;
}

export function parsePattern(raw: unknown, source: string): Pattern {
  if (!isRecord(raw)) fail(source, 'not an object');
  const id = typeof raw.id === 'string' ? raw.id : fail(source, 'missing id');
  const length = raw.length;
  if (typeof length !== 'number' || length <= 0) fail(id, 'length must be positive');
  const difficulty = raw.difficulty;
  if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) fail(id, 'difficulty must be 1..3');
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string') : [];

  const obstacles: PatternObstacle[] = [];
  for (const item of Array.isArray(raw.obstacles) ? raw.obstacles : []) {
    if (!isRecord(item)) fail(id, 'obstacle is not an object');
    if (!isObstacleType(item.type)) fail(id, `unknown obstacle type ${String(item.type)}`);
    if (!isLane(item.lane)) fail(id, `bad lane ${String(item.lane)}`);
    if (typeof item.z !== 'number' || item.z < 0 || item.z > length) fail(id, 'z out of range');
    const obstacle: PatternObstacle = { type: item.type, lane: item.lane, z: item.z };
    if (typeof item.offsetX === 'number') obstacle.offsetX = item.offsetX;
    obstacles.push(obstacle);
  }

  const coins: PatternCoins[] = [];
  for (const item of Array.isArray(raw.coins) ? raw.coins : []) {
    if (!isRecord(item) || !isLane(item.lane) || typeof item.z !== 'number') {
      fail(id, 'bad coin entry');
    }
    const count = typeof item.count === 'number' ? item.count : fail(id, 'coin count missing');
    if (item.kind === 'line') {
      const line: PatternCoins = { kind: 'line', lane: item.lane, z: item.z, count };
      if (typeof item.spacing === 'number') line.spacing = item.spacing;
      if (typeof item.y === 'number') line.y = item.y;
      coins.push(line);
    } else if (item.kind === 'arc') {
      if (typeof item.length !== 'number' || typeof item.height !== 'number') {
        fail(id, 'arc needs length and height');
      }
      coins.push({
        kind: 'arc',
        lane: item.lane,
        z: item.z,
        count,
        length: item.length,
        height: item.height,
      });
    } else {
      fail(id, `unknown coin kind ${String(item.kind)}`);
    }
  }

  obstacles.sort((a, b) => a.z - b.z);
  return { id, length, difficulty, tags, obstacles, coins };
}
