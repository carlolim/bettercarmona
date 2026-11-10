import { Link } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { BARANGAY_OFFICIALS_URL, BARANGAYS, BARANGAYS_RECORDED_AT, barangayTitle } from './data/barangays';
import { hotlineId, hotlinesDate } from './data/hotlines';
import { ExternalLink } from './ExternalLink';
import { useLocale } from './locale';
import { PageHero } from './PageHero';

export function CommunityBarangays() {
  const { locale, t, path } = useLocale();
  useTitle(t('barangays.pageTitle'));
  const date = hotlinesDate(locale, BARANGAYS_RECORDED_AT);
  return (
    <main className="main community-page community-barangays">
      <PageHero title={t('barangays.heading')} breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('nav.barangays') }]} />
      <div className="page">
        <p className="barangays-source">
          {t('barangays.source', { date })}{' '}
          <ExternalLink href={BARANGAY_OFFICIALS_URL} className="barangays-source-link">{t('barangays.sourceLink')}</ExternalLink>
        </p>
        <p className="barangays-source">{t('barangays.linksChecked', { date })}</p>

        <ul className="barangay-list">
          {BARANGAYS.map((barangay) => {
            const { number, captain, officialPage, hotline } = barangay;
            const title = barangayTitle(t, barangay);
            return (
              <li key={number} className="barangay-card">
                <h2>{title}</h2>
                <p className="barangay-captain">
                  <span>{t('barangays.captain')}</span> {captain}
                </p>
                <ul className="barangay-links">
                  <li>
                    {officialPage.available ? (
                      <ExternalLink href={officialPage.url}>
                        {t(officialPage.kind === 'website' ? 'barangays.website' : 'barangays.profile')}
                        <span className="sr-only"> {title}</span>
                      </ExternalLink>
                    ) : (
                      <span className="barangay-unavailable">{t('barangays.unavailable', { date })}</span>
                    )}
                  </li>
                  <li>
                    <Link to={path(`/hotlines#${hotlineId(hotline)}`)}>
                      {t('barangays.hotlines')}<span className="sr-only"> {title}</span>
                    </Link>
                  </li>
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
