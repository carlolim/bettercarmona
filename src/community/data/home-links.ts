import type { LocalizedString } from '../Localized';
import { OFFICIAL_PORTAL_URL } from '../links';

/** A city page or system reachable from the home page. Each description restates what that page offers. */
export interface HomeLink {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  href: string;
}

/** When every link in HOME_SERVICES was last opened and read. Shown to readers on the home page. */
export const HOME_LINKS_CHECKED_ON = '2026-11-05';

/** The destinations come from the tiles and menus on the official portal's home page, as saved on 2026-11-04. */
export const HOME_SERVICES: HomeLink[] = [
  {
    id: 'civil-registry',
    title: { en: 'Get a birth, marriage, or death record', fil: 'Kumuha ng rekord ng kapanganakan, kasal, o pagkamatay' },
    description: { en: 'Copies and certifications of records, and CENOMAR requests.', fil: 'Mga kopya at sertipikasyon ng rekord, at mga kahilingan para sa CENOMAR.' },
    href: 'https://carmonagov.net/portal/civil-registry-services/',
  },
  {
    id: 'social-welfare',
    title: { en: 'Find social welfare services', fil: 'Humanap ng serbisyong panlipunan' },
    description: {
      en: 'Programs of the City Social Welfare and Development Office, including day care and help with violence against women and children.',
      fil: 'Mga programa ng City Social Welfare and Development Office, kabilang ang day care at tulong sa karahasan laban sa kababaihan at mga bata.',
    },
    href: 'https://carmonagov.net/portal/municipal-social-welfare-and-development-office/',
  },
  {
    id: 'health',
    title: { en: 'Find a health service', fil: 'Humanap ng serbisyong pangkalusugan' },
    description: {
      en: 'Public health facilities in Carmona, including the main health center and barangay health stations.',
      fil: 'Mga pampublikong pasilidad sa Carmona, kabilang ang main health center at mga barangay health station.',
    },
    href: 'https://carmonagov.net/portal/health-services/',
  },
  {
    id: 'business-permit',
    title: { en: 'Apply for a business permit', fil: 'Mag-apply ng business permit' },
    description: { en: "Apply or renew online through e-BOSS, the city's business one-stop shop.", fil: 'Mag-apply o mag-renew online sa e-BOSS, ang business one-stop shop ng lungsod.' },
    href: 'https://egovcarmona.ph/carmona_bpl/',
  },
  {
    id: 'zoning',
    title: { en: 'Get a zoning clearance', fil: 'Kumuha ng zoning clearance' },
    description: { en: 'Requirements for a locational clearance or certificate of zoning compliance.', fil: 'Mga kailangan para sa locational clearance o certificate of zoning compliance.' },
    href: 'https://carmonagov.net/portal/elementor-1911/',
  },
  {
    id: 'building-permit',
    title: { en: 'Get a building permit', fil: 'Kumuha ng building permit' },
    description: { en: 'The checklist of requirements for a building permit.', fil: 'Ang listahan ng mga kailangan para sa building permit.' },
    href: 'https://carmonagov.net/portal/secure-building-permit/',
  },
  {
    id: 'environment',
    title: { en: 'Ask about waste and the environment', fil: 'Magtanong tungkol sa basura at kapaligiran' },
    description: { en: "Waste collection, MENRO clearances, and the environment office's other services.", fil: 'Pangongolekta ng basura, MENRO clearance, at iba pang serbisyo ng tanggapan ng kapaligiran.' },
    href: 'https://carmonagov.net/portal/environmental-and-waste-management/',
  },
  {
    id: 'jobs',
    title: { en: 'Look for a job', fil: 'Maghanap ng trabaho' },
    description: { en: "PESO Plus, the city's public employment service.", fil: 'PESO Plus, ang public employment service ng lungsod.' },
    href: 'https://egovcarmona.ph/pesoplus/',
  },
  {
    id: 'property-tax',
    title: { en: 'Pay real property tax', fil: 'Magbayad ng real property tax (amilyar)' },
    description: { en: 'Request a statement of account, check its status, and pay online.', fil: 'Humiling ng statement of account, tingnan ang status nito, at magbayad online.' },
    href: 'https://rptops.egovcarmona.ph/index',
  },
];

export const HOME_OFFICIAL_SITES: HomeLink[] = [
  {
    id: 'portal',
    title: { en: 'City of Carmona official portal', fil: 'Opisyal na portal ng Lungsod ng Carmona' },
    description: { en: 'News, offices, and documents from the city government.', fil: 'Mga balita, tanggapan, at dokumento mula sa pamahalaang lungsod.' },
    href: OFFICIAL_PORTAL_URL,
  },
  {
    id: 'service-portal',
    title: { en: 'Service portal', fil: 'Service portal' },
    description: { en: "The city's services, listed by department.", fil: 'Ang mga serbisyo ng lungsod, nakaayos ayon sa departamento.' },
    href: 'https://citizencharter.egovcarmona.ph/index',
  },
  {
    id: 'appointments',
    title: { en: 'Online appointments', fil: 'Mga appointment online' },
    description: { en: 'Choose a service and book an appointment.', fil: 'Pumili ng serbisyo at mag-book ng appointment.' },
    href: 'https://egovcarmona.ph/appointment/',
  },
];
