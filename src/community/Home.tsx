import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { HOME_LINKS_CHECKED_ON, HOME_OFFICIAL_SITES, HOME_SERVICES, type HomeLink } from './data/home-links';
import { ExternalLink } from './ExternalLink';
import { OFFICIAL_HOTLINES_URL } from './links';
import { Localized } from './Localized';
import { useLocale } from './locale';
import { SiteFooter } from './SiteFooter';

// Before task 004 the budget list lived at `/`, so filtered links to it may be in the wild.
const OLD_BUDGET_HASHES = ['#offices', '#projects'];

export function CommunityHome() {
  const { search, hash } = useLocation();
  const { locale, t, path } = useLocale();
  useTitle(t('home.title'));
  if (search || OLD_BUDGET_HASHES.includes(hash)) {
    return <Navigate replace to={{ pathname: path('/transparency'), search, hash }} />;
  }
  const checkedOn = new Intl.DateTimeFormat(locale === 'fil' ? 'fil-PH' : 'en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(`${HOME_LINKS_CHECKED_ON}T00:00:00+08:00`));
  return (
    <main className="page main community-home">
      <ExternalLink href={OFFICIAL_HOTLINES_URL} className="home-emergency">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.7a2 2 0 0 1 1.7 2z" />
        </svg>
        <span className="home-emergency-text">
          <strong>{t('home.hotlines.title')}</strong>
          <span>{t('home.hotlines.source')}</span>
        </span>
      </ExternalLink>

      <h1>{t('home.heading')}</h1>
      <p className="lede">{t('home.intro')} <Link to={path('/about')}>{t('home.whoRuns')}</Link></p>

      <section aria-labelledby="home-services">
        <h2 id="home-services">{t('home.services.heading')}</h2>
        <p className="home-note">{t('home.services.note', { date: checkedOn })}</p>
        <LinkGrid items={HOME_SERVICES} />
      </section>

      <section aria-labelledby="home-transparency" className="home-transparency">
        <h2 id="home-transparency">{t('home.transparency.heading')}</h2>
        <p>{t('home.transparency.body')}</p>
        <p><Link to={path('/transparency')} className="button button-primary">{t('home.transparency.link')}</Link></p>
      </section>

      <section aria-labelledby="home-official">
        <h2 id="home-official">{t('home.official.heading')}</h2>
        <LinkGrid items={HOME_OFFICIAL_SITES} />
      </section>
    </main>
  );
}

function LinkGrid({ items }: { items: HomeLink[] }) {
  return (
    <ul className="home-grid">
      {items.map(({ id, title, description, href }) => (
        <li key={id}>
          <ExternalLink href={href} className="home-card">
            <h3><Localized value={title} /></h3>
            <span className="home-card-text"><Localized value={description} /></span>
            <span className="home-card-host">{new URL(href).hostname}</span>
          </ExternalLink>
        </li>
      ))}
    </ul>
  );
}

export function CommunityNotFound() {
  const { t, path } = useLocale();
  return (
    <>
      <div id="main-content" tabIndex={-1} className="site-content">
        <main className="page main">
          <p className="state">{t('notFound.message')} <Link to={path('/')}>{t('notFound.homeLink')}</Link></p>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
