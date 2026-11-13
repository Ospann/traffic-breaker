import type { SaveSchema } from '@core/save';
import type { Language } from '../i18n';

export interface GameSave extends Record<string, unknown> {
  bestScore: number;
  levelsCompleted: number;
  soundEnabled: boolean;
  language: Language | null;
}

export const saveSchema: SaveSchema<GameSave> = {
  version: 2,
  defaults: () => ({
    bestScore: 0,
    levelsCompleted: 0,
    soundEnabled: true,
    language: null,
  }),
  migrations: {
    2: (data) => {
      const { highScore, ...rest } = data;
      return { ...rest, bestScore: typeof highScore === 'number' ? highScore : 0 };
    },
  },
};
