import { ExternalLink, FileText, Phone } from 'lucide-react';
import {
  AREA_CODE, AREA_CODE_RECORDED_AT, AREA_CODE_SOURCE_URL, CITY_GRAPHIC_RECORDED_AT, CITY_GRAPHIC_SOURCE,
  HOTLINES, HOTLINES_RECORDED_AT, HOTLINES_SOURCE, hotlineId, hotlinesDate, type Hotline, type HotlineNumber,
} from './data/hotlines';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The hotlines page's content. It needs no router or JavaScript in the browser, so the
 * build can also write it into the page's HTML. See scripts/hotlines-html.tsx.
 */
export function HotlinesContent({ t, locale }: { t: Translate; locale: 'en' | 'fil' }) {
  const [primary, ...otherMain] = HOTLINES.filter(({ group }) => group === 'main');
  const city = HOTLINES.filter(({ group }) => group === 'city');
  const barangays = HOTLINES.filter(({ group }) => group === 'barangay');
  return (
    <>
      <div className="bc-callout bc-callout--source">
        <span className="bc-icon"><FileText size={20} aria-hidden="true" /></span>
        <p>{t('hotlines.source', { app: HOTLINES_SOURCE, date: hotlinesDate(locale, HOTLINES_RECORDED_AT) })}</p>
      </div>

      <section aria-labelledby="hotlines-main">
        <div className="bc-section-head">
          <h2 id="hotlines-main">{t('hotlines.main.heading')}</h2>
        </div>
        <a href={`tel:${primary.numbers[0].dial}`} className="hotline-primary">
          <span className="bc-icon bc-icon--yellow"><Phone size={24} aria-hidden="true" /></span>
          <span className="hotline-primary-text">
            <strong>{primary.label}</strong>
            <span>{t('hotlines.call')} {primary.numbers[0].display}</span>
          </span>
        </a>
        <ul className="hotline-list">
          {otherMain.map((hotline) => <HotlineRow key={hotline.label} hotline={hotline} t={t} />)}
        </ul>
        <p className="hotlines-note">{t('hotlines.main.note')}</p>
      </section>

      <section aria-labelledby="hotlines-city">
        <div className="bc-section-head">
          <h2 id="hotlines-city">{t('hotlines.city.heading')}</h2>
        </div>
        <div className="bc-callout bc-callout--source">
          <span className="bc-icon"><FileText size={20} aria-hidden="true" /></span>
          <p>{t('hotlines.city.source', { date: hotlinesDate(locale, CITY_GRAPHIC_RECORDED_AT) })}</p>
          <a href={CITY_GRAPHIC_SOURCE} target="_blank" rel="noopener" className="bc-btn bc-btn--outline">
            {t('hotlines.city.link')} <ExternalLink size={15} aria-hidden="true" />
            <span className="sr-only"> {t('opensInNewTab')}</span>
          </a>
        </div>
        <ul className="hotline-list">
          {city.map((hotline) => <HotlineRow key={hotline.label} hotline={hotline} t={t} />)}
        </ul>
        <p className="hotlines-note">{t('hotlines.city.note')}</p>
      </section>

      <section aria-labelledby="hotlines-barangays">
        <div className="bc-section-head">
          <h2 id="hotlines-barangays">{t('hotlines.barangays.heading')}</h2>
        </div>
        <ul className="hotline-list">
          {barangays.map((hotline) => <HotlineRow key={hotline.label} hotline={hotline} t={t} />)}
        </ul>
        <p className="hotlines-note">
          {t('hotlines.barangays.landlines', { areaCode: AREA_CODE, date: hotlinesDate(locale, AREA_CODE_RECORDED_AT) })}{' '}
          <a href={AREA_CODE_SOURCE_URL} target="_blank" rel="noopener" className="hotline-official">
            {t('hotlines.barangays.landlinesLink')} <span aria-hidden="true">↗</span>
            <span className="sr-only"> {t('opensInNewTab')}</span>
          </a>
        </p>
        <p className="hotlines-note">{t('hotlines.barangays.numbers', { date: hotlinesDate(locale, HOTLINES_RECORDED_AT) })}</p>
      </section>
    </>
  );
}

function HotlineRow({ hotline, t }: { hotline: Hotline; t: Translate }) {
  const name = hotline.barangayNumber
    ? `${hotline.label} (${t('hotlines.barangays.number', { number: hotline.barangayNumber })})`
    : hotline.label;
  return (
    <li className="bc-card hotline-row" id={hotlineId(hotline.label)}>
      <h3>{name}</h3>
      {hotline.hours && <p className="hotline-hours">{hotline.hours}</p>}
      <ul className="hotline-numbers">
        {hotline.numbers.map((number) => <li key={number.display}><NumberEntry number={number} name={name} t={t} /></li>)}
      </ul>
    </li>
  );
}

export function NumberEntry({ number, name, t }: { number: HotlineNumber; name: string; t: Translate }) {
  return (
    <>
      <NumberLinks number={number} name={name} t={t} />
      {number.note && <span className="hotline-text">{number.note}</span>}
    </>
  );
}

function NumberLinks({ number: { display: shown, dial, sms, areaCode }, name, t }: { number: HotlineNumber; name: string; t: Translate }) {
  const display = areaCode ? `(${areaCode}) ${shown}` : shown;
  if (dial && sms) {
    return (
      <>
        <span className="hotline-text">{display}</span>
        <a href={`tel:${dial}`} className="hotline-link">
          <Phone size={16} aria-hidden="true" />{t('hotlines.call')}<span className="sr-only"> {name}: {display}</span>
        </a>
        <a href={`sms:${sms}`} className="hotline-link">
          {t('hotlines.text')}<span className="sr-only"> {name}: {display}</span>
        </a>
      </>
    );
  }
  if (dial) {
    return (
      <a href={`tel:${dial}`} className="hotline-link">
        <Phone size={16} aria-hidden="true" /><span className="sr-only">{t('hotlines.call')} {name}: </span>{display}
      </a>
    );
  }
  return <span className="hotline-text">{display}</span>;
}
