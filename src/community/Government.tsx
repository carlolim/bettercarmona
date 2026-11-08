import { useTitle } from '../lib/use-title';
import { OFFICES, OFFICES_RECORDED_AT, OFFICES_URL, OFFICIALS, OFFICIALS_RECORDED_AT, OFFICIALS_URL } from './data/government';
import { hotlinesDate } from './data/hotlines';
import { ExternalLink } from './ExternalLink';
import { useLocale } from './locale';

export function CommunityGovernment() {
  const { locale, t } = useLocale();
  useTitle(t('government.pageTitle'));
  const officialsDate = hotlinesDate(locale, OFFICIALS_RECORDED_AT);
  const officesDate = hotlinesDate(locale, OFFICES_RECORDED_AT);
  // Positions in the page's order, each with its holders: one for most, ten for the council.
  const roles = [...new Set(OFFICIALS.map((o) => o.role))].map((role) => ({ role, holders: OFFICIALS.filter((o) => o.role === role) }));

  return (
    <main className="page main community-government">
      <h1>{t('government.heading')}</h1>

      <section aria-labelledby="government-officials">
        <h2 id="government-officials">{t('government.officials.heading')}</h2>
        <p className="government-source">
          {t('government.officials.source', { date: officialsDate })}{' '}
          <ExternalLink href={OFFICIALS_URL} className="government-source-link">{t('government.officials.sourceLink')}</ExternalLink>
        </p>
        <dl className="government-officials">
          {roles.map(({ role, holders }) => (
            <div key={role}>
              <dt>{holders.length > 1 ? t('government.officials.plural', { role, count: holders.length }) : role}</dt>
              {holders.length > 1 ? (
                <dd>
                  <ul>
                    {holders.map((h, i) => <li key={i}>{h.name ?? <NotListed date={officialsDate} />}</li>)}
                  </ul>
                </dd>
              ) : (
                <dd>{holders[0].name ?? <NotListed date={officialsDate} />}</dd>
              )}
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="government-offices">
        <h2 id="government-offices">{t('government.offices.heading')}</h2>
        <p className="government-source">
          {t('government.offices.source', { date: officesDate })}{' '}
          <ExternalLink href={OFFICES_URL} className="government-source-link">{t('government.offices.sourceLink')}</ExternalLink>
        </p>
        <ul className="government-offices">
          {OFFICES.map(({ name, sourceUrl }) => (
            <li key={name}>
              {sourceUrl ? <ExternalLink href={sourceUrl}>{name}</ExternalLink> : <span>{name} <span className="government-no-link">{t('government.offices.noLink')}</span></span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function NotListed({ date }: { date: string }) {
  const { t } = useLocale();
  return <span className="government-not-listed">{t('government.officials.notListed', { date })}</span>;
}
