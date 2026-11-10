import { useId, useState } from 'react';
import { useTitle } from '../lib/use-title';
import { OFFICES, OFFICES_RECORDED_AT, OFFICES_URL, OFFICIALS, OFFICIALS_RECORDED_AT, OFFICIALS_URL, type Official } from './data/government';
import { hotlinesDate } from './data/hotlines';
import { ExternalLink } from './ExternalLink';
import { useLocale } from './locale';
import { PageHero } from './PageHero';

/** Lowercase, without accents, so "dasmarinas" finds "Dasmariñas". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function CommunityGovernment() {
  const { locale, t } = useLocale();
  useTitle(t('government.pageTitle'));
  const officialsDate = hotlinesDate(locale, OFFICIALS_RECORDED_AT);
  const officesDate = hotlinesDate(locale, OFFICES_RECORDED_AT);
  const councilors = OFFICIALS.filter((o) => o.role === 'City Councilor');
  const featured = OFFICIALS.filter((o) => o.photo && o.role !== 'City Councilor');
  const others = OFFICIALS.filter((o) => !o.photo && o.role !== 'City Councilor');

  return (
    <main className="main community-page community-government">
      <PageHero title={t('government.heading')} breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('nav.government') }]} />
      <div className="page">
        <section aria-labelledby="government-officials" className="government-officials">
          <h2 id="government-officials">{t('government.officials.heading')}</h2>
          <p className="government-source">
            {t('government.officials.source', { date: officialsDate })}{' '}
            <ExternalLink href={OFFICIALS_URL} className="government-source-link">{t('government.officials.sourceLink')}</ExternalLink>
          </p>

          <ul className="government-featured">
            {featured.map((o) => (
              <li key={o.role}>
                <img src={o.photo} alt={o.name} width={160} height={160} loading="lazy" decoding="async" />
                <span className="government-role">{o.role}</span>
                <span className="government-name">{o.name}</span>
              </li>
            ))}
          </ul>

          <h3 className="government-subheading">{t('government.officials.councilors', { count: councilors.length })}</h3>
          <ul className="government-councilors">
            {councilors.map((o, i) => (
              <li key={i}>
                {o.photo && <img src={o.photo} alt={o.name} width={96} height={96} loading="lazy" decoding="async" />}
                <span className="government-name">{o.name ?? <NotListed date={officialsDate} />}</span>
              </li>
            ))}
          </ul>

          <dl className="government-others">
            {others.map((o) => <Position key={o.role} official={o} date={officialsDate} />)}
          </dl>
        </section>

        <section aria-labelledby="government-offices">
          <h2 id="government-offices">{t('government.offices.heading')}</h2>
          <p className="government-source">
            {t('government.offices.source', { date: officesDate })}{' '}
            <ExternalLink href={OFFICES_URL} className="government-source-link">{t('government.offices.sourceLink')}</ExternalLink>
          </p>
          <OfficeList />
        </section>
      </div>
    </main>
  );
}

function Position({ official, date }: { official: Official; date: string }) {
  return (
    <div>
      <dt>{official.role}</dt>
      <dd>{official.name ?? <NotListed date={date} />}</dd>
    </div>
  );
}

/** The offices, with a search box that keeps the ones whose title holds every word typed, in any order. */
function OfficeList() {
  const { t } = useLocale();
  const id = useId();
  const [query, setQuery] = useState('');
  const words = fold(query).split(/\s+/).filter(Boolean);
  const shown = OFFICES.filter(({ name }) => words.every((w) => fold(name).includes(w)));
  return (
    <>
      <div className="government-search">
        <label htmlFor={id}>{t('government.offices.searchLabel')}</label>
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('government.offices.searchPlaceholder')}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p className="government-search-count" role="status">
        {words.length ? t('government.offices.searchCount', { shown: shown.length, total: OFFICES.length }) : ''}
      </p>
      {shown.length ? (
        <ul className="government-offices">
          {shown.map(({ name, sourceUrl }) => (
            <li key={name}>
              {sourceUrl ? <ExternalLink href={sourceUrl}>{name}</ExternalLink> : <span>{name} <span className="government-no-link">{t('government.offices.noLink')}</span></span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="government-no-results">{t('government.offices.noResults', { query })}</p>
      )}
    </>
  );
}

function NotListed({ date }: { date: string }) {
  const { t } = useLocale();
  return <span className="government-not-listed">{t('government.officials.notListed', { date })}</span>;
}
