import { useState } from 'react';
import { BarangayDialog } from './BarangayDialog';
import { BarangayMap } from './BarangayMap';
import { BARANGAYS, barangayTitle } from './data/barangays';
import { BOUNDARY_SOURCE } from './data/barangay-map';
import { ExternalLink } from './ExternalLink';
import { useLocale } from './locale';

/** The home page's barangay map, with every barangay also listed as a button. */
export function BarangayFinder() {
  const { t } = useLocale();
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const title = (number: number) => barangayTitle(t, BARANGAYS.find((b) => b.number === number)!);
  const hovered = active === null ? null : title(active);

  return (
    <section aria-labelledby="home-barangays" className="home-barangays">
      <h2 id="home-barangays">{t('home.map.heading')}</h2>
      <p className="home-note">{t('home.map.intro')}</p>
      <div className="barangay-finder">
        <div>
          <BarangayMap
            active={active}
            onPreview={setActive}
            onSelect={setSelected}
            label={title}
            cityLabel={t('home.map.cityLabel')}
            insetLabel={t('home.map.insetLabel')}
            insetHeading={t('home.map.insetHeading')}
          />
          <p className="barangay-map-hint" aria-hidden="true">{hovered ?? t('home.map.hint')}</p>
        </div>
        <div>
          <h3 className="barangay-finder-list-heading">{t('home.map.listHeading')}</h3>
          <ul className="barangay-finder-list">
            {BARANGAYS.map((barangay) => (
              <li key={barangay.number}>
                <button
                  type="button"
                  data-barangay={barangay.number}
                  className={active === barangay.number ? 'is-active' : undefined}
                  onClick={() => setSelected(barangay.number)}
                  onFocus={() => setActive(barangay.number)}
                  onBlur={() => setActive(null)}
                  onPointerEnter={() => setActive(barangay.number)}
                  onPointerLeave={() => setActive(null)}
                >
                  {title(barangay.number)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="barangay-map-credit">
        {t('home.map.credit', { psgc: BOUNDARY_SOURCE.psgc })}
      </p>
      <ul className="barangay-map-credit-links">
        <li><ExternalLink href={BOUNDARY_SOURCE.original}>{t('home.map.creditOriginal')}</ExternalLink></li>
        <li><ExternalLink href={BOUNDARY_SOURCE.dataset}>{t('home.map.creditDataset')}</ExternalLink></li>
        <li><ExternalLink href={BOUNDARY_SOURCE.license}>{t('home.map.creditLicense')}</ExternalLink></li>
      </ul>
      <BarangayDialog number={selected} title={title} onClose={() => setSelected(null)} />
    </section>
  );
}
