import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from './locale';

/** A breadcrumb item. `to` is a path without its language prefix; the last item, the current page, has none. */
export type Crumb = { label: ReactNode; to?: string };

// The rays of the sun in public/brand/bettercarmona-mark.svg, on the same 64 by 64 grid.
const SUN_RAYS = 'M48.5 29.75L58 28.5L62 32L58 35.5L48.5 34.25ZM45.26 42.08L52.86 47.91L53.21 53.21L47.91 52.86L42.08 45.26Z'
  + 'M34.25 48.5L35.5 58L32 62L28.5 58L29.75 48.5ZM21.92 45.26L16.09 52.86L10.79 53.21L11.14 47.91L18.74 42.08Z'
  + 'M15.5 34.25L6 35.5L2 32L6 28.5L15.5 29.75ZM18.74 21.92L11.14 16.09L10.79 10.79L16.09 11.14L21.92 18.74Z'
  + 'M29.75 15.5L28.5 6L32 2L35.5 6L34.25 15.5ZM42.08 18.74L47.91 11.14L53.21 10.79L52.86 16.09L45.26 21.92Z';

/**
 * The green band that opens every community page. The site header floats over it until the page scrolls.
 * The home page's form is taller, has no breadcrumb, and has the logo's sun behind the text.
 */
export function PageHero({ title, lede, breadcrumb, home, children }: {
  title: ReactNode;
  lede?: ReactNode;
  breadcrumb?: Crumb[];
  home?: boolean;
  children?: ReactNode;
}) {
  const { t, path } = useLocale();
  return (
    <div className={home ? 'bc-hero bc-hero--home' : 'bc-hero'}>
      {home && (
        <svg className="bc-hero-sun" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d={SUN_RAYS} />
          <path d="M38.89 26.21A9 9 0 1 0 38.89 37.79" fill="none" stroke="currentColor" strokeWidth="5.5" />
        </svg>
      )}
      <div className="bc-hero-inner">
        {breadcrumb && (
          <nav className="bc-breadcrumb" aria-label={t('breadcrumb.label')}>
            {breadcrumb.map(({ label, to }, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
                {to ? <Link to={path(to)}>{label}</Link> : <span aria-current="page">{label}</span>}
              </Fragment>
            ))}
          </nav>
        )}
        <h1 className="bc-hero-title">{title}</h1>
        {lede && <p className="bc-hero-lede">{lede}</p>}
        {children}
      </div>
    </div>
  );
}

/** An empty hero for a page that is still loading, so the header keeps its look over it. */
export function PageHeroPlaceholder() {
  return (
    <main className="main community-page" aria-busy="true">
      <div className="bc-hero" aria-hidden="true"><div className="bc-hero-inner bc-hero-placeholder" /></div>
    </main>
  );
}
