import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from './locale';

/** A breadcrumb item. `to` is a path without its language prefix; the last item, the current page, has none. */
export type Crumb = { label: ReactNode; to?: string };

/** The green band that opens every community page. The site header floats over it until the page scrolls. */
export function PageHero({ title, lede, breadcrumb, children }: {
  title: ReactNode;
  lede?: ReactNode;
  breadcrumb?: Crumb[];
  children?: ReactNode;
}) {
  const { t, path } = useLocale();
  return (
    <div className="bc-hero">
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
