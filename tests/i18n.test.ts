import { describe, expect, it } from 'vitest';
import { I18n, normalizeLanguage } from '@core/i18n';
import { createI18n } from '../src/i18n';
import en from '../src/i18n/en.json';
import ru from '../src/i18n/ru.json';
import tr from '../src/i18n/tr.json';

const dict = { hello: 'Hello, {name}!', onlyEn: 'English only', bye: 'Bye' };

function create() {
  return new I18n<typeof dict, 'en' | 'ru'>({
    dictionaries: { en: dict, ru: { hello: 'Привет, {name}!', bye: '' } },
    fallback: 'en',
  });
}

describe('I18n', () => {
  it('uses the fallback language until a language is set', () => {
    expect(create().language).toBe('en');
  });

  it('normalises platform language codes', () => {
    expect(normalizeLanguage('ru-RU')).toBe('ru');
    expect(normalizeLanguage(' TR_tr ')).toBe('tr');
    expect(normalizeLanguage(undefined)).toBe('');
  });

  it('falls back to en for unsupported or empty languages', () => {
    const i18n = create();
    expect(i18n.setLanguage('de')).toBe('en');
    expect(i18n.setLanguage('')).toBe('en');
    expect(i18n.setLanguage(null)).toBe('en');
    expect(i18n.setLanguage('ru-RU')).toBe('ru');
  });

  it('falls back to en for keys missing in the current language', () => {
    const i18n = create();
    i18n.setLanguage('ru');
    expect(i18n.t('onlyEn')).toBe('English only');
    expect(i18n.t('bye')).toBe('Bye');
  });

  it('interpolates params and leaves unknown placeholders untouched', () => {
    const i18n = create();
    i18n.setLanguage('ru');
    expect(i18n.t('hello', { name: 'Аня' })).toBe('Привет, Аня!');
    expect(i18n.t('hello')).toBe('Привет, {name}!');
    expect(i18n.t('hello', { other: 1 })).toBe('Привет, {name}!');
  });

  it('notifies listeners only when the language changes', () => {
    const i18n = create();
    const seen: string[] = [];
    i18n.onChange((language) => seen.push(language));
    i18n.setLanguage('ru');
    i18n.setLanguage('ru');
    i18n.setLanguage('xx');
    expect(seen).toEqual(['ru', 'en']);
  });
});

describe('game dictionaries', () => {
  it('ru and tr define every key from en', () => {
    const keys = Object.keys(en).toSorted();
    expect(Object.keys(ru).toSorted()).toEqual(keys);
    expect(Object.keys(tr).toSorted()).toEqual(keys);
  });

  it('createI18n supports en, ru and tr', () => {
    const i18n = createI18n();
    expect(i18n.languages.toSorted()).toEqual(['en', 'ru', 'tr']);
    expect(i18n.setLanguage('tr-TR')).toBe('tr');
    expect(i18n.t('menu.play')).toBe('Oyna');
  });
});
