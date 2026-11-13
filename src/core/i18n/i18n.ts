export type Dictionary = Record<string, string>;

export type TranslationParams = Record<string, string | number>;

export interface I18nOptions<D extends Dictionary, L extends string> {
  dictionaries: Readonly<Record<L, Partial<D>>>;
  fallback: L;
}

export function normalizeLanguage(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

export class I18n<D extends Dictionary, L extends string> {
  private current: L;
  private readonly dictionaries: Readonly<Record<L, Partial<D>>>;
  private readonly fallback: L;
  private readonly supported: readonly L[];
  private readonly listeners = new Set<(language: L) => void>();

  constructor(options: I18nOptions<D, L>) {
    this.dictionaries = options.dictionaries;
    this.fallback = options.fallback;
    this.current = options.fallback;
    this.supported = Object.keys(options.dictionaries).filter((language): language is L =>
      Object.hasOwn(options.dictionaries, language),
    );
  }

  get language(): L {
    return this.current;
  }

  get languages(): L[] {
    return [...this.supported];
  }

  isSupported(language: string): language is L {
    return Object.hasOwn(this.dictionaries, language);
  }

  resolve(raw: string | null | undefined): L {
    const normalized = normalizeLanguage(raw);
    return this.isSupported(normalized) ? normalized : this.fallback;
  }

  setLanguage(raw: string | null | undefined): L {
    const next = this.resolve(raw);
    if (next !== this.current) {
      this.current = next;
      for (const listener of this.listeners) listener(next);
    }
    return next;
  }

  onChange(listener: (language: L) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  t(key: keyof D & string, params?: TranslationParams): string {
    const template = this.lookup(this.current, key) ?? this.lookup(this.fallback, key) ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : match,
    );
  }

  private lookup(language: L, key: keyof D & string): string | undefined {
    const value: unknown = this.dictionaries[language][key];
    return typeof value === 'string' && value !== '' ? value : undefined;
  }
}
