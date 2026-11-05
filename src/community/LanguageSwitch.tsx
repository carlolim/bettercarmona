import { Link, useLocation } from 'react-router-dom';
import { LOCALES, stripLocale, useLocale, withLocale, type Locale } from './locale';

const NAMES: Record<Locale, string> = { en: 'English', fil: 'Filipino' };

/** Each language's name is written in that language, and the link keeps the reader on the same page. */
export function LanguageSwitch() {
  const { pathname, search, hash } = useLocation();
  const { locale, t } = useLocale();
  const page = stripLocale(pathname);
  return (
    <nav className="language-switch" aria-label={t('language.label')}>
      {LOCALES.map((l) => (
        <Link
          key={l}
          to={{ pathname: withLocale(page, l), search, hash }}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? 'true' : undefined}
        >
          {NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}
