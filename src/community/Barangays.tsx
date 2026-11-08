import { Link } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { BARANGAY_OFFICIALS_URL, BARANGAYS, BARANGAYS_RECORDED_AT } from './data/barangays';
import { hotlineId, hotlinesDate } from './data/hotlines';
import { ExternalLink } from './ExternalLink';
import { useLocale } from './locale';

export function CommunityBarangays() {
  const { locale, t, path } = useLocale();
  useTitle(t('barangays.pageTitle'));
  const date = hotlinesDate(locale, BARANGAYS_RECORDED_AT);
  return (
    <main className="page main community-barangays">
      <h1>{t('barangays.heading')}</h1>
      <p className="barangays-source">
        {t('barangays.source', { date })}{' '}
        <ExternalLink href={BARANGAY_OFFICIALS_URL} className="barangays-source-link">{t('barangays.sourceLink')}</ExternalLink>
      </p>
      <p className="barangays-source">{t('barangays.linksChecked', { date })}</p>

      <ul className="barangay-list">
        {BARANGAYS.map(({ number, name, captain, officialPage, hotline }) => {
          const title = name ? `${t('barangays.number', { number })} (${name})` : t('barangays.number', { number });
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
    </main>
  );
}
