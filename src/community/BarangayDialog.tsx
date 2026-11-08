import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BARANGAYS, BARANGAYS_RECORDED_AT } from './data/barangays';
import { AREA_CODE_RECORDED_AT, HOTLINES, HOTLINES_RECORDED_AT, HOTLINES_SOURCE, hotlineId, hotlinesDate } from './data/hotlines';
import { ExternalLink } from './ExternalLink';
import { NumberEntry } from './HotlinesContent';
import { useLocale } from './locale';

/** A barangay's captain, official page, and hotline numbers, opened from the map or the list. */
export function BarangayDialog({ number, title, onClose }: { number: number | null; title: (number: number) => string; onClose: () => void }) {
  const { locale, t, path } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const translate = (key: string, values?: Record<string, string | number>) => t(key, values ?? {});

  useEffect(() => {
    const element = dialog.current;
    if (!element || number === null) return;
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    element.showModal();
    return () => {
      if (element.open) element.close();
    };
  }, [number]);

  const barangay = BARANGAYS.find((b) => b.number === number);
  const hotline = barangay && HOTLINES.find((h) => h.label === barangay.hotline);
  const name = barangay ? title(barangay.number) : '';

  return (
    <dialog
      ref={dialog}
      className="barangay-dialog"
      aria-labelledby="barangay-dialog-title"
      onClose={() => {
        // The close event is queued, and input can run first: a quick reopen can beat it. Then it's stale.
        if (dialog.current?.open) return;
        onClose();
        // The browser returns focus to what opened the dialog. After a tap on the map nothing had focus, so
        // put it on this barangay's button, without scrolling the page to the list. Leave focus alone if it
        // has already moved on.
        const focused = document.activeElement;
        if (focused && focused !== document.body && !dialog.current?.contains(focused)) return;
        const back = opener.current ?? document.querySelector<HTMLElement>(`[data-barangay="${number}"]`);
        back?.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}
    >
      {barangay && (
        <div className="barangay-dialog-body">
          <div className="barangay-dialog-head">
            <h2 id="barangay-dialog-title">{name}</h2>
            <button type="button" className="barangay-dialog-close" onClick={() => dialog.current?.close()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              <span className="sr-only">{t('barangayDialog.close')}</span>
            </button>
          </div>

          <dl className="barangay-dialog-facts">
            <dt>{t('barangays.captain')}</dt>
            <dd>{barangay.captain}</dd>
            <dt>{t('barangayDialog.officialPage')}</dt>
            <dd>
              {barangay.officialPage.available ? (
                <ExternalLink href={barangay.officialPage.url}>
                  {t(barangay.officialPage.kind === 'website' ? 'barangays.website' : 'barangays.profile')}
                </ExternalLink>
              ) : (
                t('barangays.unavailable', { date: hotlinesDate(locale, BARANGAYS_RECORDED_AT) })
              )}
            </dd>
            <dt>{t('barangays.hotlines')}</dt>
            <dd>
              <ul className="hotline-numbers">
                {hotline?.numbers.map((n) => <li key={n.display}><NumberEntry number={n} name={name} t={translate} /></li>)}
              </ul>
            </dd>
          </dl>

          <p className="barangay-dialog-sources">
            {t('barangayDialog.captainSource', { date: hotlinesDate(locale, BARANGAYS_RECORDED_AT) })}{' '}
            {t('barangayDialog.numbersSource', {
              app: HOTLINES_SOURCE,
              date: hotlinesDate(locale, HOTLINES_RECORDED_AT),
              areaCodeDate: hotlinesDate(locale, AREA_CODE_RECORDED_AT),
            })}
          </p>

          <ul className="barangay-dialog-links">
            <li><Link to={path('/barangays')}>{t('barangayDialog.allBarangays')}</Link></li>
            <li><Link to={path(`/hotlines#${hotlineId(barangay.hotline)}`)}>{t('barangayDialog.allHotlines')}</Link></li>
          </ul>
        </div>
      )}
    </dialog>
  );
}
