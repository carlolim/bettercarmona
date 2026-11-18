import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from './locale';

/** A breadcrumb item. `to` is a path without its language prefix; the last item, the current page, has none. */
export type Crumb = { label: ReactNode; to?: string };

// The sun in public/brand/bettercarmona-logo.svg, redrawn on a 64 by 64 grid. One ray per line.
const SUN_RAYS = [
  'M30.9 19.88L30.9 3.57L32 2L33.1 3.57L33.1 19.88ZM33.56 19.31L33.56 4.23L35.23 6.62L34.13 19.31ZM30.44 19.31L29.87 19.31L28.77 6.62L30.44 4.23Z',
  'M39.79 22.66L51.33 11.12L53.21 10.79L52.88 12.67L41.34 24.21ZM42.08 24.13L52.74 13.46L52.23 16.33L42.48 24.53ZM39.87 21.92L39.47 21.52L47.67 11.77L50.54 11.26Z',
  'M44.12 30.9L60.43 30.9L62 32L60.43 33.1L44.12 33.1ZM44.69 33.56L59.77 33.56L57.38 35.23L44.69 34.13ZM44.69 30.44L44.69 29.87L57.38 28.77L59.77 30.44Z',
  'M41.34 39.79L52.88 51.33L53.21 53.21L51.33 52.88L39.79 41.34ZM39.87 42.08L50.54 52.74L47.67 52.23L39.47 42.48ZM42.08 39.87L42.48 39.47L52.23 47.67L52.74 50.54Z',
  'M33.1 44.12L33.1 60.43L32 62L30.9 60.43L30.9 44.12ZM30.44 44.69L30.44 59.77L28.77 57.38L29.87 44.69ZM33.56 44.69L34.13 44.69L35.23 57.38L33.56 59.77Z',
  'M24.21 41.34L12.67 52.88L10.79 53.21L11.12 51.33L22.66 39.79ZM21.92 39.87L11.26 50.54L11.77 47.67L21.52 39.47ZM24.13 42.08L24.53 42.48L16.33 52.23L13.46 52.74Z',
  'M19.88 33.1L3.57 33.1L2 32L3.57 30.9L19.88 30.9ZM19.31 30.44L4.23 30.44L6.62 28.77L19.31 29.87ZM19.31 33.56L19.31 34.13L6.62 35.23L4.23 33.56Z',
  'M22.66 24.21L11.12 12.67L10.79 10.79L12.67 11.12L24.21 22.66ZM24.13 21.92L13.46 11.26L16.33 11.77L24.53 21.52ZM21.92 24.13L21.52 24.53L11.77 16.33L11.26 13.46Z',
].join('');
const SUN_DISC = { cx: 32, cy: 32, r: 11.25 };

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
          <circle {...SUN_DISC} />
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
