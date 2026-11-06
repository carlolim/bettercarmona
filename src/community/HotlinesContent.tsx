import { HOTLINES, HOTLINES_SOURCE, type Hotline, type HotlineNumber } from './data/hotlines';
import { OFFICIAL_HOTLINES_URL } from './links';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The hotlines page's content. It needs no router or JavaScript in the browser, so the
 * build can also write it into the page's HTML. See scripts/hotlines-html.tsx.
 */
export function HotlinesContent({ t, date }: { t: Translate; date: string }) {
  const [primary, ...otherMain] = HOTLINES.filter(({ group }) => group === 'main');
  const barangays = HOTLINES.filter(({ group }) => group === 'barangay');
  return (
    <>
      <h1>{t('hotlines.heading')}</h1>
      <p className="hotlines-source">{t('hotlines.source', { app: HOTLINES_SOURCE, date })}</p>

      <section aria-labelledby="hotlines-main">
        <h2 id="hotlines-main">{t('hotlines.main.heading')}</h2>
        <a href={`tel:${primary.numbers[0].dial}`} className="hotline-primary">
          <PhoneIcon size={28} />
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

      <section aria-labelledby="hotlines-barangays">
        <h2 id="hotlines-barangays">{t('hotlines.barangays.heading')}</h2>
        <ul className="hotline-list">
          {barangays.map((hotline) => <HotlineRow key={hotline.label} hotline={hotline} t={t} />)}
        </ul>
        <p className="hotlines-note">{t('hotlines.barangays.landlines')}</p>
        <p className="hotlines-note">{t('hotlines.barangays.numbers', { date })}</p>
      </section>

      <section aria-labelledby="hotlines-other">
        <h2 id="hotlines-other">{t('hotlines.other.heading')}</h2>
        <p>{t('hotlines.other.body')}</p>
        <p>
          <a href={OFFICIAL_HOTLINES_URL} target="_blank" rel="noopener" className="hotline-official">
            {t('hotlines.other.link')} <span aria-hidden="true">↗</span>
            <span className="sr-only"> {t('opensInNewTab')}</span>
          </a>
        </p>
      </section>
    </>
  );
}

function HotlineRow({ hotline, t }: { hotline: Hotline; t: Translate }) {
  const name = hotline.barangayNumber
    ? `${hotline.label} (${t('hotlines.barangays.number', { number: hotline.barangayNumber })})`
    : hotline.label;
  return (
    <li className="hotline-row">
      <h3>{name}</h3>
      <ul className="hotline-numbers">
        {hotline.numbers.map((number) => <li key={number.display}><NumberEntry number={number} name={name} t={t} /></li>)}
      </ul>
    </li>
  );
}

function NumberEntry({ number: { display, dial, sms }, name, t }: { number: HotlineNumber; name: string; t: Translate }) {
  if (dial && sms) {
    return (
      <>
        <span className="hotline-text">{display}</span>
        <a href={`tel:${dial}`} className="hotline-link">
          <PhoneIcon size={16} />{t('hotlines.call')}<span className="sr-only"> {name}: {display}</span>
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
        <PhoneIcon size={16} /><span className="sr-only">{t('hotlines.call')} {name}: </span>{display}
      </a>
    );
  }
  return <span className="hotline-text">{display}</span>;
}

export function PhoneIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
