/** The city's Barangay Officials page. It gives no date of its own. */
export const BARANGAY_OFFICIALS_URL = 'https://carmonagov.net/portal/barangay-officials/';
/** The day the officials page was read and every official page link below was checked. */
export const BARANGAYS_RECORDED_AT = '2026-11-08';
/** Linked from the portal's menu as "Barangay Profile Map". Plain HTTP on a bare IP address; it didn't connect when checked. */
export const BARANGAY_MAP_URL = 'http://119.92.77.137/brgyprofile/';

export interface Barangay {
  number: number;
  /** The name the officials page gives in brackets, where it gives one. */
  name?: string;
  /** As the officials page lists them, without the "Hon." title. */
  captain: string;
  /** The link in the portal's "Barangay Profiles" menu, saved 2026-11-04. */
  officialPage: {
    url: string;
    /** The city portal's profile page, or the barangay's own website. */
    kind: 'profile' | 'website';
    /** False when the link returned "not found" on BARANGAYS_RECORDED_AT. */
    available: boolean;
  };
  /** The barangay's label in HOTLINES. */
  hotline: string;
  source: string;
  recordedAt: string;
}

const fromOfficials = { source: BARANGAY_OFFICIALS_URL, recordedAt: BARANGAYS_RECORDED_AT };
const profile = (url: string) => ({ url, kind: 'profile' as const, available: true });
const notFound = (url: string) => ({ url, kind: 'profile' as const, available: false });

export const BARANGAYS: Barangay[] = [
  { ...fromOfficials, number: 1, captain: 'Marvin A. Maulanin', officialPage: profile('https://carmonagov.net/portal/barangay-1-profile/'), hotline: 'Barangay 1' },
  { ...fromOfficials, number: 2, captain: 'Deogracias D. Ventura II', officialPage: profile('https://carmonagov.net/portal/barangay-2-profile/'), hotline: 'Barangay 2' },
  { ...fromOfficials, number: 3, captain: 'Arnel B. Reyes', officialPage: profile('https://carmonagov.net/portal/barangay-3-profile/'), hotline: 'Barangay 3' },
  { ...fromOfficials, number: 4, captain: 'Ludeomar L. Andres', officialPage: notFound('https://carmonagov.net/brgy4'), hotline: 'Barangay 4' },
  { ...fromOfficials, number: 5, captain: 'Ruelito C. Manuel', officialPage: profile('https://carmonagov.net/portal/barangay-5-profile/'), hotline: 'Barangay 5' },
  { ...fromOfficials, number: 6, captain: 'Alberto S. Hermosa', officialPage: notFound('https://carmonagov.net/brgy6/'), hotline: 'Barangay 6' },
  { ...fromOfficials, number: 7, captain: 'Danilo C. Lopez', officialPage: profile('https://carmonagov.net/portal/barangay-7-profile/'), hotline: 'Barangay 7' },
  { ...fromOfficials, number: 8, name: 'Rosario', captain: 'Salvador C. Zamora', officialPage: notFound('https://carmonagov.net/brgy8/'), hotline: 'Barangay 8' },
  { ...fromOfficials, number: 9, name: 'Maduya', captain: 'Danlist E. Tenedero', officialPage: notFound('https://carmonagov.net/brgymaduya/'), hotline: 'Barangay Maduya' },
  { ...fromOfficials, number: 10, name: 'Cabilang Baybay', captain: 'Gaudencio M. Legacion', officialPage: profile('https://carmonagov.net/portal/barangay-10-cabilang-baybay-profile/'), hotline: 'Cabilang Baybay' },
  { ...fromOfficials, number: 11, name: 'Mabuhay', captain: 'Fernan C. Barabat', officialPage: profile('https://carmonagov.net/portal/barangay-11-mabuhay-profile/'), hotline: 'Mabuhay' },
  { ...fromOfficials, number: 12, name: 'Milagrosa', captain: 'Fernando M. Oseña', officialPage: { url: 'https://carmonagov.net/milagrosa/', kind: 'website', available: true }, hotline: 'Milagrosa' },
  { ...fromOfficials, number: 13, name: 'Lantic', captain: 'Alejandro V. Trinidad', officialPage: profile('https://carmonagov.net/portal/barangay-13-lantic-profile/'), hotline: 'Lantic' },
  { ...fromOfficials, number: 14, name: 'Bancal', captain: 'Jefferson M. Levardo', officialPage: profile('https://carmonagov.net/portal/barangay-14-bancal-profile/'), hotline: 'Bancal' },
];
