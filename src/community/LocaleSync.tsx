import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePortal } from '../lib/portal-context';
import { LOCALES, localeOf, stripLocale, withLocale } from './locale';

function setHeadLink(key: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[data-locale-link="${key}"]`);
  if (!el) {
    el = document.createElement('link');
    el.dataset.localeLink = key;
    document.head.appendChild(el);
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
}

/** Keeps <html lang>, the canonical URL, and the hreflang links in step with the page. */
export function LocaleSync() {
  const { pathname } = useLocation();
  const { config } = usePortal();
  useEffect(() => {
    document.documentElement.lang = localeOf(pathname);
    const base = (config.siteUrl ?? window.location.origin).replace(/\/+$/, '');
    const url = (path: string) => `${base}${path === '/' ? '' : path}`;
    const page = stripLocale(pathname);
    for (const locale of LOCALES) {
      setHeadLink(locale, { rel: 'alternate', hreflang: locale, href: url(withLocale(page, locale)) });
    }
    setHeadLink('x-default', { rel: 'alternate', hreflang: 'x-default', href: url(page) });
    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', url(pathname));
    document.head.querySelector('meta[property="og:url"]')?.setAttribute('content', url(pathname));
  }, [pathname, config.siteUrl]);
  return null;
}
