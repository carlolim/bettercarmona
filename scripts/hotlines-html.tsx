/**
 * Writes the hotlines list into the HTML of /hotlines and /fil/hotlines, so the numbers
 * show before the JavaScript loads, or without it. The app replaces this markup once it starts.
 */
import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plugin } from 'vite';
import { HotlinesContent } from '../src/community/HotlinesContent.tsx';
import { OFFICIAL_PORTAL_URL } from '../src/community/links.ts';
import en from '../src/community/locales/en.json';
import fil from '../src/community/locales/fil.json';

const PAGES = [
  { locale: 'en', fileName: 'hotlines.html', translation: en },
  { locale: 'fil', fileName: 'fil/hotlines.html', translation: fil },
] as const;

function render(shell: string, { locale, translation }: (typeof PAGES)[number]): string {
  const i18n = i18next.createInstance();
  i18n.init({ resources: { [locale]: { translation } }, lng: locale, initAsync: false, interpolation: { escapeValue: false } });
  const t = (key: string, values?: Record<string, string | number>) => i18n.t(key, values ?? {});
  const body = renderToStaticMarkup(
    <>
      <div className="site-utility">
        <div className="page site-utility-inner">
          <a href={OFFICIAL_PORTAL_URL} target="_blank" rel="noopener" className="site-official">{t('officialSite')}</a>
        </div>
      </div>
      <main className="page main community-hotlines">
        <HotlinesContent t={t} locale={locale} />
      </main>
      <footer className="site-footer">
        <div className="page site-footer-inner">
          <p className="site-statement">{t('footer.statement')}</p>
        </div>
      </footer>
    </>,
  );
  return shell
    .replace('<html lang="en">', `<html lang="${locale}">`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${t('hotlines.pageTitle')}</title>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
    .replace(/<noscript>[^<]*<\/noscript>\s*/, '');
}

export function hotlinesHtml(): Plugin {
  return {
    name: 'hotlines-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const shell = bundle['index.html'];
      if (shell?.type !== 'asset') this.error('index.html is missing from the build.');
      for (const page of PAGES) {
        this.emitFile({ type: 'asset', fileName: page.fileName, source: render(String(shell.source), page) });
      }
    },
  };
}
