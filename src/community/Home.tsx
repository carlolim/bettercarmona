import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { BarangayFinder } from './BarangayFinder';
import { HOME_LINKS_CHECKED_ON, HOME_OFFICIAL_SITES, HOME_SERVICES, type HomeLink } from './data/home-links';
import { ExternalLink } from './ExternalLink';
import { PhoneIcon } from './HotlinesContent';
import { Localized } from './Localized';
import { useLocale } from './locale';
import { PageHero } from './PageHero';
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
      <Link to={path('/hotlines')} className="home-emergency">
        <PhoneIcon size={28} />
        <span className="home-emergency-text">
          <strong>{t('home.hotlines.title')}</strong>
          <span>{t('home.hotlines.source')}</span>
        </span>
      </Link>

      <h1>{t('home.heading')}</h1>
      <p className="lede">{t('home.intro')} <Link to={path('/about')}>{t('home.whoRuns')}</Link></p>

      <BarangayFinder />

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
      <div id="main-content" tabIndex={-1} className="site-content community-content">
        <main className="main community-page">
          <PageHero title={t('notFound.message')} breadcrumb={[{ label: t('nav.home'), to: '/' }]} />
          <div className="page">
            <p className="state"><Link to={path('/')}>{t('notFound.homeLink')}</Link></p>
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
