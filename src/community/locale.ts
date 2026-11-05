/**
 * The language comes from the URL: `/` is English and `/fil/...` is Filipino, so
 * each language has its own shareable address.
 */
import i18next from 'i18next';
import { useMemo } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import en from './locales/en.json';
import fil from './locales/fil.json';

export type Locale = 'en' | 'fil';
export const LOCALES: readonly Locale[] = ['en', 'fil'];

i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, fil: { translation: fil } },
  lng: 'en',
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export function localeOf(pathname: string): Locale {
  return pathname === '/fil' || pathname.startsWith('/fil/') ? 'fil' : 'en';
}

/** The path without its language prefix: `/fil/transparency` becomes `/transparency`. */
export function stripLocale(pathname: string): string {
  return localeOf(pathname) === 'fil' ? pathname.slice('/fil'.length) || '/' : pathname;
}

/** The same page in a given language. */
export function withLocale(path: string, locale: Locale): string {
  if (locale === 'en') return path;
  return path === '/' ? '/fil' : `/fil${path}`;
}

/** Strings and paths for the language of the current URL. */
export function useLocale() {
  const { pathname } = useLocation();
  const locale = localeOf(pathname);
  const { t } = useTranslation(undefined, { lng: locale });
  return useMemo(() => ({ locale, t, path: (to: string) => withLocale(to, locale) }), [locale, t]);
}
