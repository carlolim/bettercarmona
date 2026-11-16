import { ArrowLeft, FileText, Info, TriangleAlert } from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { hotlinesDate } from './data/hotlines';
import {
  loadOrdinance, loadOrdinanceIndex,
  type Block, type Inline, type ListItem, type OrdinanceDetail, type OrdinanceListItem,
} from './data/ordinances';
import { ExternalLink } from './ExternalLink';
import { useLocale } from './locale';
import { PageHero } from './PageHero';

const PAGE_SIZE = 30;

/** Lowercase, without accents, so "dasmarinas" finds "Dasmariñas". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** The number as the document prints it, else as the library lists it. */
const numberOf = (o: OrdinanceListItem) => o.number_printed ?? o.number_listed;

/** The language of an ordinance's own words, for the `lang` attribute. Mixed or unknown gets none. */
const langOf = (language: string | null) => (language === 'en' || language === 'fil' ? language : undefined);

function useIndex() {
  const [items, setItems] = useState<OrdinanceListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadOrdinanceIndex().then((list) => live && setItems(list), () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { items, failed };
}

export function CommunityOrdinances() {
  const { t } = useLocale();
  useTitle(t('ordinances.pageTitle'));
  const { items, failed } = useIndex();
  return (
    <main className="main community-page community-services">
      <PageHero title={t('ordinances.heading')} lede={t('ordinances.intro')} breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('ordinances.heading') }]} />
      <div className="page services-body services-narrow">
        <div className="bc-callout ordinance-standing">
          <Info size={20} aria-hidden="true" />
          <p>{t('ordinances.standing')}</p>
        </div>
        {failed ? (
          <p className="state" role="alert">{t('ordinances.failed')}</p>
        ) : items ? (
          <OrdinanceList items={items} />
        ) : (
          <p className="state" aria-busy="true">{t('ordinances.loading')}</p>
        )}
      </div>
    </main>
  );
}

/** Search, category, and year, kept in the URL so a filtered list can be linked to. */
function OrdinanceList({ items }: { items: OrdinanceListItem[] }) {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const ids = { q: useId(), category: useId(), year: useId() };
  // The filters live in state, which queues quick changes, and are copied to the URL after each change, so a
  // filtered list survives a reload and can be shared.
  const [filters, setFilters] = useState(() => ({ q: params.get('q') ?? '', category: params.get('category') ?? '', year: params.get('year') ?? '' }));
  const { q, category, year } = filters;
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) next.set(k, v);
    if (next.toString() !== new URLSearchParams(window.location.search).toString()) setParams(next, { replace: true });
  }, [filters, setParams]);

  const set = (key: 'q' | 'category' | 'year', value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setShown(PAGE_SIZE);
  };

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean) as string[])].sort(), [items]);
  const years = useMemo(() => [...new Set(items.map((i) => i.year).filter(Boolean) as number[])].sort((a, b) => b - a), [items]);
  const words = fold(q).split(/\s+/).filter(Boolean);
  const matches = items.filter((i) => {
    if (category && i.category !== category) return false;
    if (year && String(i.year) !== year) return false;
    if (!words.length) return true;
    const haystack = fold([i.title, i.title_en, i.number_printed, i.number_listed, ...i.keywords].filter(Boolean).join(' '));
    return words.every((w) => haystack.includes(w));
  });
  const filtered = Boolean(words.length || category || year);

  return (
    <>
      <div className="bc-card ordinance-filters">
        <div className="ordinance-field ordinance-field--wide">
          <label htmlFor={ids.q}>{t('ordinances.searchLabel')}</label>
          <input
            id={ids.q}
            className="bc-input"
            type="search"
            value={q}
            onChange={(e) => set('q', e.target.value)}
            placeholder={t('ordinances.searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="ordinance-field">
          <label htmlFor={ids.category}>{t('ordinances.category')}</label>
          <select id={ids.category} className="bc-select" value={category} onChange={(e) => set('category', e.target.value)}>
            <option value="">{t('ordinances.allCategories')}</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ordinance-field">
          <label htmlFor={ids.year}>{t('ordinances.year')}</label>
          <select id={ids.year} className="bc-select" value={year} onChange={(e) => set('year', e.target.value)}>
            <option value="">{t('ordinances.allYears')}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <p className="ordinance-count" role="status">
        {filtered ? t('ordinances.searchCount', { shown: matches.length, total: items.length }) : t('ordinances.shown', { shown: Math.min(shown, items.length), total: items.length })}
      </p>
      {matches.length ? (
        <ul className="services-cards">
          {matches.slice(0, shown).map((o) => <li key={o.sb_id}><OrdinanceCard ordinance={o} /></li>)}
        </ul>
      ) : (
        <p className="state">{t('ordinances.noResults')}</p>
      )}
      {matches.length > shown && (
        <button type="button" className="bc-btn bc-btn--outline ordinance-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
          {t('ordinances.showMore')}
        </button>
      )}
    </>
  );
}

/** One row of the list. The whole card links to the ordinance. */
function OrdinanceCard({ ordinance: o }: { ordinance: OrdinanceListItem }) {
  const { t, path } = useLocale();
  const number = numberOf(o);
  return (
    <Link to={path(`/ordinances/${o.sb_id}`)} className="bc-card bc-card--link service-card">
      <span className="bc-icon"><FileText size={20} aria-hidden="true" /></span>
      <span className="service-card-body">
        <span className="ordinance-card-number">
          {number ? `No. ${number}` : t('ordinances.noNumber')} <span className="ordinance-card-year">{o.year ?? t('ordinances.noYear')}</span>
        </span>
        <span className="service-card-title" lang={langOf(o.language)}>{o.title}</span>
        <span className="ordinance-tags">
          {o.category && <span className="bc-tag bc-tag--neutral">{o.category}</span>}
          <span className="bc-tag">{t(`ordinances.coverage.${o.coverage}`)}</span>
        </span>
      </span>
    </Link>
  );
}

// One ordinance

export function CommunityOrdinance() {
  const { sbId = '' } = useParams();
  const { t, path } = useLocale();
  const [state, setState] = useState<{ id: string; ordinance: OrdinanceDetail | null; failed?: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    loadOrdinance(sbId).then(
      (ordinance) => live && setState({ id: sbId, ordinance }),
      () => live && setState({ id: sbId, ordinance: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [sbId]);
  const ordinance = state?.id === sbId ? state.ordinance : undefined;
  const number = ordinance ? numberOf(ordinance) : null;
  useTitle(ordinance ? `${number ? `No. ${number}` : ordinance.title.slice(0, 60)} · ${t('ordinances.pageTitle')}` : t('ordinances.pageTitle'));

  if (ordinance === undefined) {
    return (
      <main className="main community-page" aria-busy="true">
        <PageHero title={t('ordinances.heading')} breadcrumb={[{ label: t('ordinances.heading'), to: '/ordinances' }]} />
      </main>
    );
  }
  if (ordinance === null) {
    return (
      <main className="main community-page">
        <PageHero title={state?.failed ? t('ordinances.failed') : t('ordinances.notFound')} breadcrumb={[{ label: t('ordinances.heading'), to: '/ordinances' }]} />
        <div className="page">
          <p className="state"><Link to={path('/ordinances')}>{t('ordinances.allOrdinances')}</Link></p>
        </div>
      </main>
    );
  }
  return <OrdinanceDetailPage ordinance={ordinance} />;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

function OrdinanceDetailPage({ ordinance: o }: { ordinance: OrdinanceDetail }) {
  const { locale, t, path } = useLocale();
  const number = numberOf(o);
  const lang = langOf(o.language);
  const date = (d: string | null) => (d ? hotlinesDate(locale, d) : t('ordinances.facts.notStated'));
  const listFor = o.category ? `/ordinances?category=${encodeURIComponent(o.category)}` : '/ordinances';
  return (
    <main className="main community-page community-services service-detail">
      <PageHero
        title={number ? `No. ${number}` : t('ordinances.noNumber')}
        lede={<span lang={lang}>{o.title}</span>}
        breadcrumb={[{ label: t('ordinances.heading'), to: '/ordinances' }, { label: number ? `No. ${number}` : String(o.sb_id) }]}
      >
        {o.title_en && <p className="bc-hero-lede ordinance-translation">{t('ordinances.translation')} <span lang="en">{o.title_en}</span></p>}
      </PageHero>
      <div className="page service-layout">
        <aside className="service-side">
          <div className="bc-callout service-source">
            <FileText size={20} aria-hidden="true" />
            <p><strong>{t('ordinances.source')}.</strong> {t('ordinances.sourceText', { date: hotlinesDate(locale, o.source.fetched_at) })}</p>
            <ExternalLink href={o.source.page_url} icon className="bc-btn bc-btn--outline">{t('ordinances.libraryPage')}</ExternalLink>
            {o.source.file_url && <ExternalLink href={o.source.file_url} icon className="bc-btn bc-btn--outline">{t('ordinances.scan')}</ExternalLink>}
          </div>
          <dl className="bc-card service-facts">
            {o.number_listed && o.number_listed !== o.number_printed && <Fact label={t('ordinances.facts.listed')}>{o.number_listed}</Fact>}
            {o.kind && <Fact label={t('ordinances.facts.kind')}>{t(`ordinances.kinds.${o.kind}`, { defaultValue: o.kind })}</Fact>}
            {o.coverage !== 'none' && (
              <>
                <Fact label={t('ordinances.facts.issuingBody')}><span lang={lang}>{o.issuing_body ?? t('ordinances.facts.notStated')}</span></Fact>
                {o.session && <Fact label={t('ordinances.facts.session')}><span lang={lang}>{o.session}</span></Fact>}
                <Fact label={t('ordinances.facts.dateEnacted')}>{date(o.date_enacted)}</Fact>
                <Fact label={t('ordinances.facts.dateApproved')}>{date(o.date_approved)}</Fact>
                {o.introduced_by.length > 0 && <Fact label={t('ordinances.facts.introducedBy')}>{o.introduced_by.join(', ')}</Fact>}
                {o.committees.length > 0 && <Fact label={t('ordinances.facts.committees')}>{o.committees.join(', ')}</Fact>}
              </>
            )}
            {o.category && <Fact label={t('ordinances.facts.category')}>{o.category}</Fact>}
          </dl>
        </aside>

        <div className="service-main">
          <div className="service-notices">
            <div className="bc-callout bc-callout--note" role="note">
              <TriangleAlert size={20} aria-hidden="true" />
              <p>{t(`ordinances.status.${o.status}`, { defaultValue: t('ordinances.status.unverified') })}</p>
            </div>
            {o.pandemic && (
              <div className="bc-callout bc-callout--note" role="note">
                <TriangleAlert size={20} aria-hidden="true" />
                <p>{t('ordinances.pandemic')}</p>
              </div>
            )}
            {o.coverage !== 'none' && !o.reviewed && (
              <div className="bc-callout" role="note">
                <Info size={20} aria-hidden="true" />
                <p>{t('ordinances.unreviewed')}</p>
              </div>
            )}
          </div>

          {o.coverage === 'none' ? (
            <section aria-labelledby="ordinance-description">
              <h2 id="ordinance-description">{t('ordinances.description')}</h2>
              <p className="bc-card ordinance-plain" lang={lang}>{o.description || o.listed_title}</p>
              <p>{o.missing_file ? t('ordinances.missingFile') : t('ordinances.none')}</p>
            </section>
          ) : (
            <>
              <section aria-labelledby="ordinance-summary">
                <h2 id="ordinance-summary">{t('ordinances.summary')}</h2>
                <p className="ordinance-label">{t('ordinances.summaryNote')}</p>
                <p className="bc-card ordinance-plain">{locale === 'fil' ? o.summary_fil : o.summary_en}</p>
              </section>
              {o.coverage === 'summary' && (
                <section aria-labelledby="ordinance-facts">
                  <h2 id="ordinance-facts">{t('ordinances.keyFacts')}</h2>
                  <ul className="bc-card ordinance-key-facts" lang={lang}>
                    {o.key_facts.map((f, i) => (
                      <li key={i}>
                        <strong>{f.label}:</strong> {f.value} <span className="ordinance-page-ref">({t('ordinances.page', { page: f.page })})</span>
                      </li>
                    ))}
                  </ul>
                  <p>{t('ordinances.summaryOnly')}</p>
                </section>
              )}
              {o.coverage === 'full' && (
                <section aria-labelledby="ordinance-text">
                  <h2 id="ordinance-text">{t('ordinances.text')}</h2>
                  <p className="ordinance-label">{t('ordinances.textNote')}</p>
                  <div className="bc-card ordinance-text" lang={lang}>
                    <Blocks blocks={o.blocks} />
                  </div>
                </section>
              )}
            </>
          )}

          <p>
            <Link to={path(listFor)} className="bc-btn bc-btn--quiet ordinance-back">
              <ArrowLeft size={18} aria-hidden="true" /> {o.category ? t('ordinances.backToCategory', { category: o.category }) : t('ordinances.allOrdinances')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

// The text, from blocks

function Runs({ runs }: { runs: Inline[] }) {
  return (
    <>
      {runs.map((r, i) =>
        r.mark ? <span key={i} className="ordinance-mark">{r.text}</span> : r.em ? <em key={i}>{r.text}</em> : <Fragment key={i}>{r.text}</Fragment>,
      )}
    </>
  );
}

function Items({ items }: { items: ListItem[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          <Runs runs={item.text} />
          {item.items && <Items items={item.items} />}
        </li>
      ))}
    </ul>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const { locale, t } = useLocale();
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return b.level === 2 ? <h3 key={i}><Runs runs={b.text} /></h3> : <h4 key={i}><Runs runs={b.text} /></h4>;
          case 'paragraph':
            return (
              <p key={i}>
                {b.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    <Runs runs={line} />
                  </Fragment>
                ))}
              </p>
            );
          case 'list':
            return <Items key={i} items={b.items} />;
          case 'table':
            return (
              <div key={i} className="ordinance-table">
                <table>
                  <thead><tr>{b.head.map((c, j) => <th key={j} scope="col"><Runs runs={c} /></th>)}</tr></thead>
                  <tbody>{b.rows.map((row, j) => <tr key={j}>{row.map((c, k) => <td key={k}><Runs runs={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case 'page':
            return <p key={i} className="ordinance-page-marker" lang={locale}><span>{t('ordinances.pageMarker', { n: b.n })}</span></p>;
        }
      })}
    </>
  );
}
