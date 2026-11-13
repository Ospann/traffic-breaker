import { parsePattern, type Pattern } from './pattern-schema';

const modules = import.meta.glob<{ default: unknown }>('./data/*.json', { eager: true });

export const patterns: readonly Pattern[] = Object.entries(modules)
  .map(([path, module]) => parsePattern(module.default, path))
  .toSorted((a, b) => a.id.localeCompare(b.id));
