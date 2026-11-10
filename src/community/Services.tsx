import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTitle } from '../lib/use-title';
import { hotlinesDate } from './data/hotlines';
import {
  CITIZENS_CHARTER_2026, SERVICE_CATEGORIES, SERVICES, charterPageUrl, serviceById,
  type Requirement, type Service, type ServiceStep,
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

export function CommunityServices() {
  const { locale, t, path } = useLocale();
  useTitle(t('services.pageTitle'));
  const source = CITIZENS_CHARTER_2026;
  return (
    <main className="main community-page community-services">
      <PageHero title={t('services.heading')} lede={t('services.intro')} breadcrumb={[{ label: t('nav.home'), to: '/' }, { label: t('services.heading') }]} />
      <div className="page">
        <p className="services-source">
          {t('services.source', { title: source.title, edition: source.edition, date: hotlinesDate(locale, source.recordedAt) })}{' '}
          <ExternalLink href={source.url} className="services-source-link">{t('services.sourceLink')}</ExternalLink>
        </p>
        <p className="services-source">{t('services.coverage')}</p>
        {locale === 'fil' && <p className="services-source">{t('services.englishNote')}</p>}

        {SERVICE_CATEGORIES.map((category) => {
          const services = SERVICES.filter((s) => s.category === category.id);
          const headingId = `services-${category.id}`;
          return (
            <section key={category.id} aria-labelledby={headingId}>
              <h2 id={headingId}><Localized value={category.title} /></h2>
              <p className="services-category-description"><Localized value={category.description} /></p>
              {(category.officeUrl || category.online) && (
                <ul className="services-category-links">
                  {category.online && (
                    <li>
                      <ExternalLink href={category.online.url}><Localized value={category.online.label} /></ExternalLink>{' '}
                      <span className="services-checked">{t('services.checkedOn', { date: hotlinesDate(locale, category.online.checkedOn) })}</span>
                    </li>
                  )}
                  {category.officeUrl && (
                    <li><ExternalLink href={category.officeUrl}>{t('services.officePage')}</ExternalLink></li>
                  )}
                </ul>
              )}
              <ul className="services-list">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link to={path(`/services/${s.id}`)}><Charter>{s.title}</Charter></Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
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
  return (
    <main className="main community-page community-services service-detail">
      <PageHero
        title={<Charter>{s.title}</Charter>}
        breadcrumb={[{ label: t('services.heading'), to: '/services' }, { label: <Charter>{s.title}</Charter> }]}
      />
      <div className="page">
        <div className="service-source">
          <p>
            {t('services.detailSource', {
              publisher: s.source.publisher, title: s.source.title, edition: s.source.edition, pages,
              date: hotlinesDate(locale, s.source.recordedAt),
            })}
          </p>
          <p><ExternalLink href={charterPageUrl(s.source, first)}>{t('services.openPage', { page: first })}</ExternalLink></p>
          <p>{t('services.checkFirst')}</p>
        </div>

        {s.online && (
          <p className="service-online">
            <ExternalLink href={s.online.url}><Localized value={s.online.label} /></ExternalLink>{' '}
            <span className="services-checked">{t('services.checkedOn', { date: hotlinesDate(locale, s.online.checkedOn) })}</span>
          </p>
        )}

        {s.caveats?.map((c, i) => (
          <p key={i} className="service-caveat" role="note"><strong>{t('services.caveat')}</strong> <Localized value={c} /></p>
        ))}

        <p className="service-description"><Charter>{s.description}</Charter></p>

        <dl className="service-facts">
          <div><dt>{t('services.office')}</dt><dd><Charter>{s.office}</Charter></dd></div>
          <div><dt>{t('services.classification')}</dt><dd><Charter>{s.classification}</Charter></dd></div>
          <div><dt>{t('services.transactionType')}</dt><dd><Charter>{s.transactionType}</Charter></dd></div>
          <div>
            <dt>{t('services.whoMayAvail')}</dt>
            <dd>
              {s.whoMayAvail.length === 1 ? <Charter>{s.whoMayAvail[0]}</Charter> : (
                <ul>{s.whoMayAvail.map((w) => <li key={w}><Charter>{w}</Charter></li>)}</ul>
              )}
            </dd>
          </div>
        </dl>

        <section aria-labelledby="service-requirements">
          <h2 id="service-requirements">{t('services.requirements')}</h2>
          <Requirements items={s.requirements} />
          {s.requirementsWhere && (
            <p className="service-where-all">{t('services.whereAll')} <Charter>{s.requirementsWhere.join('; ')}</Charter></p>
          )}
          {s.notes?.map((n) => <p key={n} className="service-note"><Charter>{n}</Charter></p>)}
        </section>

        <section aria-labelledby="service-steps">
          <h2 id="service-steps">{t('services.steps')}</h2>
          <Steps steps={s.steps} />
        </section>

        <section aria-labelledby="service-total">
          <h2 id="service-total">{t('services.total')}</h2>
          <dl className="service-facts">
            <div>
              <dt>{t('services.fees')}</dt>
              <dd>{s.total.fee.length ? <Lines lines={s.total.fee} /> : t('services.noTotalFee')}</dd>
            </div>
            <div><dt>{t('services.time')}</dt><dd><Lines lines={s.total.time} /></dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}

function Requirements({ items }: { items: Requirement[] }) {
  const { t } = useLocale();
  return (
    <ul className="service-requirements">
      {items.map((r, i) => (
        <li key={i}>
          <Charter>{r.text}</Charter>
          {r.where && (
            <span className="service-where">
              {t('services.where')} <Charter>{r.where.join('; ')}</Charter>
            </span>
          )}
          {r.items && <Requirements items={r.items} />}
        </li>
      ))}
    </ul>
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
        <li key={i}>
          <p className="service-client"><span className="service-label">{t('services.you')}</span> <Charter>{step.client}</Charter></p>
          <ul className="service-rows">
            {step.rows.map((r, j) => (
              <li key={j}>
                {r.action && <p><span className="service-label">{t('services.theOffice')}</span> <Charter>{r.action}</Charter></p>}
                {(r.fee || r.time) && (
                  <dl className="service-row-facts">
                    {r.fee && <div><dt>{t('services.fee')}</dt><dd><Lines lines={r.fee} /><Span steps={r.feeSteps} /></dd></div>}
                    {r.time && <div><dt>{t('services.time')}</dt><dd><Lines lines={r.time} /><Span steps={r.timeSteps} /></dd></div>}
                  </dl>
                )}
              </li>
            ))}
          </ul>
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
