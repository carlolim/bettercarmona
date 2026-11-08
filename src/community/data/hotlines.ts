import { OFFICIAL_HOTLINES_URL } from '../links';

export const HOTLINES_SOURCE = 'BML Carmona App';
/** The day the app's Emergency Hotlines screen was viewed. Shown to readers on the page. */
export const HOTLINES_RECORDED_AT = '2026-11-04';

/** The app lists landlines without an area code. This one is from the Wikipedia article's infobox ("+63 (0)46"). */
export const AREA_CODE = '046';
export const AREA_CODE_SOURCE_URL = 'https://en.wikipedia.org/w/index.php?title=Carmona,_Cavite&oldid=1376553498';
export const AREA_CODE_RECORDED_AT = '2026-11-08';

/** The city's "Health and Emergency Hotline Numbers" graphic, uploaded to its website on 2024-06-19. */
export const CITY_GRAPHIC_SOURCE = OFFICIAL_HOTLINES_URL;
export const CITY_GRAPHIC_RECORDED_AT = '2026-11-08';

export interface HotlineNumber {
  /** Exactly as the app shows it. */
  display: string;
  /** Set only where a tel: link is safe. */
  dial?: string;
  /** The area code, added to a landline the app lists without one. */
  areaCode?: string;
  /** What the source writes beside this number, such as hours or a station's name. */
  note?: string;
  /** Set only where the app lists the number for SMS. */
  sms?: string;
}

export interface Hotline {
  /** The app's label, as written. */
  label: string;
  numbers: HotlineNumber[];
  group: 'main' | 'city' | 'barangay';
  source: string;
  recordedAt: string;
  /** The number the official portal's menu gives a barangay the app lists by name. */
  barangayNumber?: number;
  /** Office hours, as the source writes them. */
  hours?: string;
}

const fromApp = { source: HOTLINES_SOURCE, recordedAt: HOTLINES_RECORDED_AT };
const fromCityGraphic = { source: CITY_GRAPHIC_SOURCE, recordedAt: CITY_GRAPHIC_RECORDED_AT };

/** A 7-digit landline without its area code, dialed with it. */
function landline(display: string): HotlineNumber {
  return { display, areaCode: AREA_CODE, dial: AREA_CODE + display.replaceAll('-', '') };
}

/** The main number first, with the rest of each group in the app's order. */
export const HOTLINES: Hotline[] = [
  { ...fromApp, group: 'main', label: 'Emergency Hotline', numbers: [{ display: '09171120291', dial: '09171120291' }] },
  { ...fromApp, group: 'main', label: 'SMS Offline Emergency', numbers: [{ display: '09171120291', dial: '09171120291', sms: '09171120291' }] },
  { ...fromApp, group: 'main', label: 'Main Hotline', numbers: [{ display: '0917-1120-291', dial: '09171120291' }] },
  // The city graphic's labels are in capitals; they are written here in title case, in the graphic's order.
  { ...fromCityGraphic, group: 'city', label: 'City Health Office', hours: '8:00 AM - 5:00 PM', numbers: [
    landline('443-5397'),
    { display: '0917-583-6578', dial: '09175836578' },
    { display: '0976-278-6863', dial: '09762786863' },
    { display: '0915-374-8460', dial: '09153748460' },
  ] },
  { ...fromCityGraphic, group: 'city', label: 'Pagamutang Bayan ng Carmona', hours: '24/7', numbers: [
    landline('430-1644'),
    { ...landline('840-6029'), note: 'ER/Lab/Xray' },
  ] },
  { ...fromCityGraphic, group: 'city', label: 'City Disaster Risk Reduction and Management Office', numbers: [
    { ...landline('889-2773'), note: '8:00 AM - 5:00 PM' },
    { display: '0917-112-0291', dial: '09171120291' },
  ] },
  { ...fromCityGraphic, group: 'city', label: 'Philippine National Police Carmona', numbers: [
    { display: '0926-662-0472', dial: '09266620472' },
    { display: '0998-598-5610', dial: '09985985610' },
  ] },
  { ...fromCityGraphic, group: 'city', label: 'Bureau of Fire Protection Carmona', numbers: [
    landline('889-2813'),
    { display: '0915-602-1572', dial: '09156021572', note: 'City of Carmona Central Fire Station' },
    { display: '0947-319-3311', dial: '09473193311', note: 'Bancal Fire Substation' },
  ] },
  { ...fromApp, group: 'barangay', label: 'Barangay 1', numbers: [{ display: '0921-358-2117', dial: '09213582117' }, landline('430-0916')] },
  { ...fromApp, group: 'barangay', label: 'Barangay 2', numbers: [{ display: '0931-023-7868', dial: '09310237868' }, landline('430-5190')] },
  { ...fromApp, group: 'barangay', label: 'Barangay 3', numbers: [{ display: '0977-802-3066', dial: '09778023066' }, landline('889-4683')] },
  { ...fromApp, group: 'barangay', label: 'Barangay 4', numbers: [{ display: '0917-970-6446', dial: '09179706446' }, landline('404-5413')] },
  { ...fromApp, group: 'barangay', label: 'Barangay 5', numbers: [{ display: '0967-779-4373', dial: '09677794373' }, { display: '0942-004-1733', dial: '09420041733' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 6', numbers: [{ display: '0961-776-9118', dial: '09617769118' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 7', numbers: [{ display: '0965-226-3004', dial: '09652263004' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay 8', numbers: [{ display: '0949-964-9665', dial: '09499649665' }] },
  { ...fromApp, group: 'barangay', label: 'Barangay Maduya', barangayNumber: 9, numbers: [{ display: '0998-975-0114', dial: '09989750114' }] },
  { ...fromApp, group: 'barangay', label: 'Cabilang Baybay', barangayNumber: 10, numbers: [{ display: '0966-644-6853', dial: '09666446853' }] },
  { ...fromApp, group: 'barangay', label: 'Mabuhay', barangayNumber: 11, numbers: [{ display: '0956-882-7629', dial: '09568827629' }, landline('413-0226'), landline('487-3766')] },
  { ...fromApp, group: 'barangay', label: 'Milagrosa', barangayNumber: 12, numbers: [{ display: '0993-398-6421', dial: '09933986421' }, landline('886-9472'), landline('886-9403')] },
  { ...fromApp, group: 'barangay', label: 'Lantic', barangayNumber: 13, numbers: [{ display: '0921-629-0155', dial: '09216290155' }, landline('443-9067')] },
  { ...fromApp, group: 'barangay', label: 'Bancal', barangayNumber: 14, numbers: [{ display: '0995-352-1479', dial: '09953521479' }, landline('430-3388'), landline('430-2601')] },
];

export function hotlinesDate(locale: 'en' | 'fil', date = HOTLINES_RECORDED_AT): string {
  return new Intl.DateTimeFormat(locale === 'fil' ? 'fil-PH' : 'en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(`${date}T00:00:00+08:00`));
}
