export function browserLanguage(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
}
