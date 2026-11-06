export const HOTLINES_SOURCE = 'BML Carmona App';
/** The day the app's Emergency Hotlines screen was viewed. Shown to readers on the page. */
export const HOTLINES_RECORDED_AT = '2026-11-04';

export interface HotlineNumber {
  /** Exactly as the app shows it. */
  display: string;
  /** Set only where a tel: link is safe. Landlines have no area code in the app, so they get none. */
  dial?: string;
  /** Set only where the app lists the number for SMS. */
  sms?: string;
}

export interface Hotline {
  /** The app's label, as written. */
  label: string;
  numbers: HotlineNumber[];
  group: 'main' | 'barangay';
  source: string;
  recordedAt: string;
  /** The number the official portal's menu gives a barangay the app lists by name. */
  barangayNumber?: number;
}

const fromApp = { source: HOTLINES_SOURCE, recordedAt: HOTLINES_RECORDED_AT };

/** The main number first, with the rest of each group in the app's order. */
export const HOTLINES: Hotline[] = [
  { ...fromApp, group: 'main', label: 'Emergency Hotline', numbers: [{ display: '09171120291', dial: '09171120291' }] },
  { ...fromApp, group: 'main', label: 'SMS Offline Emergency', numbers: [{ display: '09171120291', dial: '09171120291', sms: '09171120291' }] },
  { ...fromApp, group: 'main', label: 'Main Hotline', numbers: [{ display: '0917-1120-291', dial: '09171120291' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 1', numbers: [{ display: '0921-358-2117', dial: '09213582117' }, { display: '430-0916' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 2', numbers: [{ display: '0931-023-7868', dial: '09310237868' }, { display: '430-5190' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 3', numbers: [{ display: '0977-802-3066', dial: '09778023066' }, { display: '889-4683' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 4', numbers: [{ display: '0917-970-6446', dial: '09179706446' }, { display: '404-5413' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 5', numbers: [{ display: '0967-779-4373', dial: '09677794373' }, { display: '0942-004-1733', dial: '09420041733' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 6', numbers: [{ display: '0961-776-9118', dial: '09617769118' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 7', numbers: [{ display: '0965-226-3004', dial: '09652263004' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 8', numbers: [{ display: '0949-964-9665', dial: '09499649665' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay Maduya', barangayNumber: 9, numbers: [{ display: '0998-975-0114', dial: '09989750114' }] },
  // The second value may be two numbers run together, so it stays as the app shows it, with no link.
  { ...fromApp, group: 'barangay', label: 'Cabilang Baybay', barangayNumber: 10, numbers: [{ display: '0966-644-6853', dial: '09666446853' }, { display: '889-9816-889-9818' }] },
  { ...fromApp, group: 'barangay', label: 'Mabuhay', barangayNumber: 11, numbers: [{ display: '0956-882-7629', dial: '09568827629' }, { display: '413-0226' }, { display: '487-3766' }] },
  { ...fromApp, group: 'barangay', label: 'Milagrosa', barangayNumber: 12, numbers: [{ display: '0993-398-6421', dial: '09933986421' }, { display: '886-9472' }, { display: '886-9403' }] },
  { ...fromApp, group: 'barangay', label: 'Lantic', barangayNumber: 13, numbers: [{ display: '0921-629-0155', dial: '09216290155' }, { display: '443-9067' }] },
  { ...fromApp, group: 'barangay', label: 'Bancal', barangayNumber: 14, numbers: [{ display: '0995-352-1479', dial: '09953521479' }, { display: '430-3388' }, { display: '430-2601' }] },
];

export function hotlinesDate(locale: 'en' | 'fil'): string {
  return new Intl.DateTimeFormat(locale === 'fil' ? 'fil-PH' : 'en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(`${HOTLINES_RECORDED_AT}T00:00:00+08:00`));
}
