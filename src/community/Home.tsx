import { ArrowRight, ExternalLink as ExternalLinkIcon, Phone } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { BarangayFinder } from './BarangayFinder';
import { HOME_LINKS_CHECKED_ON, HOME_OFFICIAL_SITES, HOME_SERVICES, type HomeLink } from './data/home-links';
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
    <main className="main community-page community-home">
      <PageHero home title={t('home.heading')} lede={<>{t('home.intro')} <Link to={path('/about')}>{t('home.whoRuns')}</Link></>}>
        <div className="home-hero-actions">
          <Link to={path('/services')} className="bc-btn bc-btn--white bc-btn--lg">
            {t('home.browseServices')} <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to={path('/hotlines')} className="bc-btn bc-btn--glass bc-btn--lg">
            <Phone size={18} aria-hidden="true" className="home-hero-phone" /> {t('home.hotlines.title')}
          </Link>
        </div>
      </PageHero>

      <div className="page home-emergency-wrap">
        <Link to={path('/hotlines')} className="bc-card bc-card--link home-emergency">
          <span className="bc-icon bc-icon--yellow"><Phone size={24} aria-hidden="true" /></span>
          <span className="home-emergency-text">
            <strong>{t('home.hotlines.title')}</strong>
            <span>{t('home.hotlines.source')}</span>
          </span>
          <span className="bc-icon bc-icon--solid home-emergency-arrow"><ArrowRight size={20} aria-hidden="true" /></span>
        </Link>
      </div>

      <div className="page home-sections">
        <section aria-labelledby="home-services">
          <div className="bc-section-head">
            <h2 id="home-services">{t('home.services.heading')}</h2>
            <p>{t('home.services.note', { date: checkedOn })}</p>
          </div>
          <LinkGrid items={HOME_SERVICES} />
        </section>

        <BarangayFinder />

        <section aria-labelledby="home-transparency" className="home-band">
          <div className="home-band-text">
            <h2 id="home-transparency">{t('home.transparency.heading')}</h2>
            <p>{t('home.transparency.body')}</p>
          </div>
          <Link to={path('/transparency')} className="bc-btn bc-btn--white bc-btn--lg">
            {t('home.transparency.link')} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="home-official">
          <div className="bc-section-head">
            <h2 id="home-official">{t('home.official.heading')}</h2>
          </div>
          <LinkGrid items={HOME_OFFICIAL_SITES} />
        </section>
      </div>
    </main>
  );
}

/** Link cards to the city's own sites. Each card is one link, so it lifts on hover. */
function LinkGrid({ items }: { items: HomeLink[] }) {
  const { t } = useLocale();
  return (
    <ul className="home-grid">
      {items.map(({ id, title, description, href, icon: Icon }) => (
        <li key={id}>
          <a href={href} target="_blank" rel="noopener" className="bc-card bc-card--link home-card">
            <span className="bc-icon"><Icon size={20} aria-hidden="true" /></span>
            <span className="home-card-body">
              <h3><Localized value={title} /></h3>
              <span className="home-card-text"><Localized value={description} /></span>
              <span className="home-card-host">
                {new URL(href).hostname} <ExternalLinkIcon size={13} aria-hidden="true" />
                <span className="sr-only"> {t('opensInNewTab')}</span>
              </span>
            </span>
          </a>
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
