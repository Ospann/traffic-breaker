import { I18n } from '@core/i18n';
import en from './en.json';
import ru from './ru.json';
import tr from './tr.json';

export type TranslationKey = keyof typeof en;
export type Language = 'en' | 'ru' | 'tr';

export function createI18n(): I18n<typeof en, Language> {
  return new I18n<typeof en, Language>({
    dictionaries: { en, ru, tr },
    fallback: 'en',
  });
}

export type GameI18n = ReturnType<typeof createI18n>;
