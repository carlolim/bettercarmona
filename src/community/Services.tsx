import { ArrowRight, Check, Clock, FileText, Info, PhilippinePeso, TriangleAlert, Users } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { hotlinesDate } from './data/hotlines';
import {
  CITIZENS_CHARTER_2026, SERVICE_CATEGORIES, SERVICES, charterPageUrl, serviceById,
  type Requirement, type Service, type ServiceCategory, type ServiceStep,
} from './data/services';
import { ExternalLink } from './ExternalLink';
import { Localized } from './Localized';
import { useLocale } from './locale';
import { PageHero } from './PageHero';

/** Charter text is in English; on /fil pages, mark it so screen readers read it as English. */
function Charter({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return locale === 'fil' ? <span lang="en">{children}</span> : <>{children}</>;
}

const servicesIn = (category: ServiceCategory) => SERVICES.filter((s) => s.category === category.id);
const categoryById = (id: string | undefined) => SERVICE_CATEGORIES.find((c) => c.id === id);

export function CommunityServices() {
  const { locale, t } = useLocale();
  useTitle(t('services.pageTitle'));
  return (
    <main className="main community-page community-services">
      <PageHero title={t('services.heading')} lede={t('services.intro')} breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('services.heading') }]} />
      <div className="page services-body">
        <CharterSource />
        <p className="services-coverage">{t('services.coverage')}</p>
        {locale === 'fil' && <p className="services-coverage">{t('services.englishNote')}</p>}
        <div className="services-categories">
          {SERVICE_CATEGORIES.map((category) => <CategoryCard key={category.id} category={category} />)}
        </div>
      </div>
    </main>
  );
}

/** The charter as the source of every service, with a link to the whole PDF. */
function CharterSource() {
  const { locale, t } = useLocale();
  const source = CITIZENS_CHARTER_2026;
  return (
    <div className="bc-callout services-source">
      <span className="bc-icon services-source-icon"><FileText size={20} aria-hidden="true" /></span>
      <p>{t('services.source', { title: source.title, edition: source.edition, date: hotlinesDate(locale, source.recordedAt) })}</p>
      <ExternalLink href={source.url} icon className="bc-btn bc-btn--outline">{t('services.sourceLink')}</ExternalLink>
    </div>
  );
}

/** A category on /services. It holds several links, so it is not a link itself and does not lift. */
function CategoryCard({ category }: { category: ServiceCategory }) {
  const { t, path } = useLocale();
  const count = servicesIn(category).length;
  const Icon = category.icon ?? FileText;
  const headingId = `services-${category.id}`;
  return (
    <article className="bc-card services-category" aria-labelledby={headingId}>
      <div className="services-category-top">
        <span className="bc-icon bc-icon--lg"><Icon size={24} aria-hidden="true" /></span>
        <span className="bc-tag">{t('services.count', { count })}</span>
      </div>
      <h2 id={headingId}><Localized value={category.title} /></h2>
      <p className="services-category-description"><Localized value={category.description} /></p>
      <CategoryLinks category={category} />
      <Link to={path(`/services/category/${category.id}`)} className="bc-btn bc-btn--primary services-category-button">
        {t('services.seeServices', { count })} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

/** The category's own page or system on the city's website, and its office's page. */
function CategoryLinks({ category, buttons }: { category: ServiceCategory; buttons?: boolean }) {
  const { locale, t } = useLocale();
  if (!category.online && !category.officeUrl) return null;
  const className = buttons ? 'bc-btn bc-btn--outline' : undefined;
  return (
    <ul className={buttons ? 'services-category-links services-category-links--buttons' : 'services-category-links'}>
      {category.online && (
        <li>
          <ExternalLink href={category.online.url} icon={buttons} className={className}><Localized value={category.online.label} /></ExternalLink>{' '}
          <span className="services-checked">{t('services.checkedOn', { date: hotlinesDate(locale, category.online.checkedOn) })}</span>
        </li>
      )}
      {category.officeUrl && (
        <li><ExternalLink href={category.officeUrl} icon={buttons} className={className}>{t('services.officePage')}</ExternalLink></li>
      )}
    </ul>
  );
}

export function CommunityServiceCategory() {
  const { categoryId } = useParams();
  const category = categoryById(categoryId);
  const { locale, t, path } = useLocale();
  const title = category ? (locale === 'fil' && category.title.fil) || category.title.en : '';
  useTitle(category ? `${title} · ${t('services.pageTitle')}` : t('services.pageTitle'));
  if (!category) {
    return (
      <main className="main community-page">
        <PageHero title={t('services.categoryNotFound')} breadcrumb={[{ label: t('services.heading'), to: '/services' }]} />
        <div className="page">
          <p className="state"><Link to={path('/services')}>{t('services.allServices')}</Link></p>
        </div>
      </main>
    );
  }
  return (
    <main className="main community-page community-services">
      <PageHero
        title={<Localized value={category.title} />}
        lede={<Localized value={category.description} />}
        breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('services.heading'), to: '/services' }, { label: <Localized value={category.title} /> }]}
      />
      <div className="page services-body services-narrow">
        <CharterSource />
        {locale === 'fil' && <p className="services-coverage">{t('services.englishNote')}</p>}
        <CategoryLinks category={category} buttons />
        <ul className="services-cards">
          {servicesIn(category).map((s) => <li key={s.id}><ServiceCard service={s} /></li>)}
        </ul>
      </div>
    </main>
  );
}

/** A service in a category. The whole card links to the service. */
function ServiceCard({ service: s }: { service: Service }) {
  const { t, path } = useLocale();
  return (
    <Link to={path(`/services/${s.id}`)} className="bc-card bc-card--link service-card">
      <span className="bc-icon"><FileText size={20} aria-hidden="true" /></span>
      <span className="service-card-body">
        <span className="service-card-title"><Charter>{s.title}</Charter></span>
        <span className="service-card-text"><Charter>{s.description}</Charter></span>
        <span className="service-chips">
          {s.total.fee.length > 0 && (
            <span className="bc-chip">
              <PhilippinePeso size={15} aria-hidden="true" />{t('services.fees')}: <strong><Charter>{s.total.fee.join(' ')}</Charter></strong>
            </span>
          )}
          <span className="bc-chip">
            <Clock size={15} aria-hidden="true" />{t('services.time')}: <strong><Charter>{s.total.time.join(' ')}</Charter></strong>
          </span>
        </span>
        <span className="service-card-more">{t('services.requirementsAndSteps')} <ArrowRight size={16} aria-hidden="true" /></span>
      </span>
    </Link>
  );
}

export function CommunityService() {
  const { id } = useParams();
  const service = serviceById(id);
  const { t, path } = useLocale();
  useTitle(service ? `${service.title} · ${t('services.pageTitle')}` : t('services.pageTitle'));
  if (!service) {
    return (
      <main className="main community-page">
        <PageHero title={t('services.notFound')} breadcrumb={[{ label: t('services.heading'), to: '/services' }]} />
        <div className="page">
          <p className="state"><Link to={path('/services')}>{t('services.allServices')}</Link></p>
        </div>
      </main>
    );
  }
  return <ServiceDetail service={service} />;
}

function ServiceDetail({ service: s }: { service: Service }) {
  const { locale, t } = useLocale();
  const [first, last] = s.pages;
  const pages = first === last ? t('services.page', { page: first }) : t('services.pages', { first, last });
  const category = categoryById(s.category);
  return (
    <main className="main community-page community-services service-detail">
      <PageHero
        title={<Charter>{s.title}</Charter>}
        lede={<Charter>{s.description}</Charter>}
        breadcrumb={[
          { label: t('services.heading'), to: '/services' },
          ...(category ? [{ label: <Localized value={category.title} />, to: `/services/category/${category.id}` }] : []),
          { label: <Charter>{s.title}</Charter> },
        ]}
      />
      {/* The side column comes first, so on a phone the source is read before the requirements. */}
      <div className="page service-layout">
        <aside className="service-side">
          <div className="bc-callout service-source">
            <FileText size={20} aria-hidden="true" />
            <p>
              {t('services.detailSource', {
                publisher: s.source.publisher, title: s.source.title, edition: s.source.edition, pages,
                date: hotlinesDate(locale, s.source.recordedAt),
              })}
            </p>
            <ExternalLink href={charterPageUrl(s.source, first)} icon className="bc-btn bc-btn--outline">{t('services.openPage', { page: first })}</ExternalLink>
            <p className="service-source-check">{t('services.checkFirst')}</p>
          </div>
          <dl className="bc-card service-facts">
            <div><dt>{t('services.office')}</dt><dd><Charter>{s.office}</Charter></dd></div>
            <div><dt>{t('services.classification')}</dt><dd><Charter>{s.classification}</Charter></dd></div>
            <div><dt>{t('services.transactionType')}</dt><dd><Charter>{s.transactionType}</Charter></dd></div>
          </dl>
        </aside>

        <div className="service-main">
          {(s.online || s.caveats) && (
            <div className="service-notices">
              {s.online && (
                <p className="service-online">
                  <ExternalLink href={s.online.url} icon className="bc-btn bc-btn--primary"><Localized value={s.online.label} /></ExternalLink>{' '}
                  <span className="services-checked">{t('services.checkedOn', { date: hotlinesDate(locale, s.online.checkedOn) })}</span>
                </p>
              )}
              {s.caveats?.map((c, i) => (
                <div key={i} className="bc-callout bc-callout--note" role="note">
                  <TriangleAlert size={20} aria-hidden="true" />
                  <p><strong>{t('services.caveat')}</strong> <Localized value={c} /></p>
                </div>
              ))}
            </div>
          )}

          <section aria-labelledby="service-who">
            <h2 id="service-who">{t('services.whoMayAvail')}</h2>
            <ul className="bc-card service-avail">
              {s.whoMayAvail.map((w) => <li key={w}><Users size={18} aria-hidden="true" /><Charter>{w}</Charter></li>)}
            </ul>
          </section>

          <section aria-labelledby="service-requirements">
            <h2 id="service-requirements">{t('services.requirements')}</h2>
            <ul className="bc-card service-requirements">
              {s.requirements.map((r, i) => (
                <li key={i}>
                  <span className="service-check"><Check size={16} aria-hidden="true" /></span>
                  <div className="service-requirement"><RequirementBody requirement={r} /></div>
                </li>
              ))}
            </ul>
            {s.requirementsWhere && (
              <p className="service-where-all">{t('services.whereAll')} <Charter>{s.requirementsWhere.join('; ')}</Charter></p>
            )}
            {s.notes?.map((n) => (
              <div key={n} className="bc-callout bc-callout--note service-note" role="note">
                <Info size={20} aria-hidden="true" />
                <p><Charter>{n}</Charter></p>
              </div>
            ))}
          </section>

          <section aria-labelledby="service-steps">
            <h2 id="service-steps">{t('services.steps')}</h2>
            <Steps steps={s.steps} />
          </section>

          <section aria-labelledby="service-total">
            <h2 id="service-total">{t('services.total')}</h2>
            <div className="service-total">
              <div className="bc-card">
                <span className="bc-icon"><PhilippinePeso size={22} aria-hidden="true" /></span>
                <dl>
                  <dt>{t('services.fees')}</dt>
                  {s.total.fee.length
                    ? <dd><Lines lines={s.total.fee} /></dd>
                    : <dd className="service-total-none">{t('services.noTotalFee')}</dd>}
                </dl>
              </div>
              <div className="bc-card">
                <span className="bc-icon"><Clock size={22} aria-hidden="true" /></span>
                <dl>
                  <dt>{t('services.time')}</dt>
                  <dd><Lines lines={s.total.time} /></dd>
                </dl>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const isPlain = (r: Requirement) => !r.where && !r.items;

/** A requirement's text, where to get it, and its sub-items: chips when they are plain text, a nested list otherwise. */
function RequirementBody({ requirement: r }: { requirement: Requirement }) {
  const { t } = useLocale();
  return (
    <>
      <p className="service-requirement-text"><Charter>{r.text}</Charter></p>
      {r.where && (
        <p className="service-where">
          {t('services.where')} <Charter>{r.where.join('; ')}</Charter>
        </p>
      )}
      {r.items && (r.items.every(isPlain) ? (
        <ul className="service-chips service-subitems">
          {r.items.map((item, i) => <li key={i} className="bc-chip"><Charter>{item.text}</Charter></li>)}
        </ul>
      ) : (
        <ul className="service-sublist">
          {r.items.map((item, i) => <li key={i}><RequirementBody requirement={item} /></li>)}
        </ul>
      ))}
    </>
  );
}

/** The steps, in separate numbered lists where the charter starts a new set under a heading. */
function Steps({ steps }: { steps: ServiceStep[] }) {
  const groups: ServiceStep[][] = [];
  for (const step of steps) {
    if (step.heading || !groups.length) groups.push([]);
    groups[groups.length - 1].push(step);
  }
  return groups.map((group, i) => (
    <Fragment key={i}>
      {group[0].heading && <h3 className="service-steps-heading"><Charter>{group[0].heading}</Charter></h3>}
      <StepList steps={group} />
    </Fragment>
  ));
}

function StepList({ steps }: { steps: ServiceStep[] }) {
  const { t } = useLocale();
  return (
    <ol className="service-steps">
      {steps.map((step, i) => (
        <li key={i} className="bc-card">
          <span className="bc-icon bc-icon--solid service-step-number">{i + 1}</span>
          <div className="service-step-body">
            <p className="service-client"><span className="service-label">{t('services.you')}</span> <Charter>{step.client}</Charter></p>
            <ul className="service-rows">
              {step.rows.map((r, j) => (
                <li key={j}>
                  {r.action && <p><span className="service-label">{t('services.theOffice')}</span> <Charter>{r.action}</Charter></p>}
                  {(r.fee || r.time) && (
                    <dl className="service-chips">
                      {r.fee && (
                        <div className="bc-chip">
                          <dt><PhilippinePeso size={15} aria-hidden="true" />{t('services.fee')}:</dt>{' '}
                          <dd><strong><Lines lines={r.fee} /></strong><Span steps={r.feeSteps} /></dd>
                        </div>
                      )}
                      {r.time && (
                        <div className="bc-chip">
                          <dt><Clock size={15} aria-hidden="true" />{t('services.time')}:</dt>{' '}
                          <dd><strong><Lines lines={r.time} /></strong><Span steps={r.timeSteps} /></dd>
                        </div>
                      )}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Says that a fee or time covers the steps after it too, as one cell does in the charter. */
function Span({ steps }: { steps?: number }) {
  const { t } = useLocale();
  if (!steps || steps < 2) return null;
  return <span className="service-span"> {t('services.span', { count: steps - 1 })}</span>;
}

function Lines({ lines }: { lines: string[] }) {
  return <Charter>{lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)}</Charter>;
}
