/** The city's Elected Officials page. Roles are text there; names appear only in the portraits. */
export const OFFICIALS_URL = 'https://carmonagov.net/portal/elected-officials/';
/** The day the portraits were fetched and read. */
export const OFFICIALS_RECORDED_AT = '2026-11-08';
/** The city's Departments / Offices / Units page. */
export const OFFICES_URL = 'https://carmonagov.net/portal/departments-offices-units/';
/** The day the offices page was saved. */
export const OFFICES_RECORDED_AT = '2026-11-04';

export interface Official {
  /** As the officials page labels the position. */
  role: string;
  /** As the portrait's caption prints it, in capitals, here without the title and in normal case. Absent when the page shows a placeholder. */
  name?: string;
  /** The portrait the name was read from, to trace it. */
  image?: string;
  source: string;
  recordedAt: string;
}

export interface Office {
  /** As the offices page titles it. */
  name: string;
  /** Absent when the page lists the office without a link. */
  sourceUrl?: string;
}

const fromOfficials = { source: OFFICIALS_URL, recordedAt: OFFICIALS_RECORDED_AT };

const image = (file: string) => `https://carmonagov.net/portal/wp-content/uploads/2025/09/${file}`;

/** In the officials page's order. */
export const OFFICIALS: Official[] = [
  { ...fromOfficials, role: 'Congressman, 5th District of Cavite', name: 'Roy M. Loyola', image: image('cong-1.jpg') },
  { ...fromOfficials, role: 'City Mayor', name: 'Dahlia A. Loyola', image: image('Mayor.jpg') },
  { ...fromOfficials, role: 'City Vice Mayor', name: 'Cesar L. Ines Jr.', image: image('Vice.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Roy A. Loyola III', image: image('TJ.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Bernie A. Ortiz', image: image('BERNIE.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Jojo S. Hermosa', image: image('KONSI-JOJO.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Liza Lorelie S. Levardo-Cruz', image: image('Atty.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Leonila A. Manabat', image: image('KONSI-LEONILA-A-MANABAT.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Geraldine R. Maquinay', image: image('JOJIE.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Domingo R. Tenedero', image: image('KD.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Almario S. Zamora', image: image('AYONG.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Rebecca L. Reyes', image: image('KONSI-VICKY.jpg') },
  { ...fromOfficials, role: 'City Councilor', name: 'Amable M. Lontok', image: image('CONSI-BOBBY.jpg') },
  // The page shows a placeholder image for these two.
  { ...fromOfficials, role: 'ABC President' },
  { ...fromOfficials, role: 'SK Federation President' },
];

const portal = (slug: string) => `https://carmonagov.net/portal/${slug}/`;

/** In the offices page's order, with titles as published. */
export const OFFICES: Office[] = [
  { name: 'Office of the City Assessor', sourceUrl: portal('office-of-the-municipal-assessor') },
  { name: 'Office of the City Zoning Administrator', sourceUrl: portal('office-of-the-municipal-zoning-administrator') },
  { name: 'Office of the City Building Official', sourceUrl: portal('office-of-the-building-official') },
  { name: 'Office the City Budget Officer', sourceUrl: portal('office-of-the-municipal-budget-officer') },
  { name: 'Office of the City Mayor', sourceUrl: portal('office-of-the-mayor') },
  { name: 'Office of the City Accountant', sourceUrl: portal('municipal-accounting-office') },
  { name: 'Civil Security Unit', sourceUrl: portal('civil-security-unit') },
  { name: 'Office of the City Engineer', sourceUrl: portal('engineering-office') },
  { name: 'Human Resource Management Office', sourceUrl: portal('human-resource-management-office') },
  { name: 'Office of the City Information Technology Officer', sourceUrl: portal('information-technology-unit') },
  { name: 'City Cooperative Development Office', sourceUrl: portal('municipal-cooperative-development-office') },
  { name: 'Local Economic Development and Investment Promotion Office (LEDIPO)', sourceUrl: portal('local-economic-and-investment-promotion-office-leipo') },
  { name: 'Office of the City Civil Registrar', sourceUrl: portal('office-of-the-municipal-registrar') },
  { name: 'City Disaster Risk Reduction and Management Office', sourceUrl: portal('municipal-disaster-risk-reduction-and-management-office') },
  { name: 'City Environment and Natural Resources Office', sourceUrl: portal('municipal-environment-natural-resources-office') },
  { name: 'Office City Health Officer', sourceUrl: portal('health') },
  { name: 'City Information, Tourism, Culture and Arts Officer', sourceUrl: portal('municipal-information-tourism-culture-arts-office') },
  { name: 'Office of the City Planning and Development Coordinating Officer', sourceUrl: portal('municipal-planning-development-cocrdinators-office') },
  { name: 'Office of the City Social Welfare and Development Officer', sourceUrl: portal('municipal-social-welfare-and-development-office') },
  { name: 'Office of the City Treasurer', sourceUrl: portal('municipal-treasurers-office') },
  { name: 'Office of the City Persons with Disability Affairs Officer', sourceUrl: portal('persons-with-disabilty-affairs-office') },
  { name: 'Office of the City Public Employment Service Manager', sourceUrl: portal('public-employment-service-office-peso') },
  { name: 'Office of the City Agriculturist', sourceUrl: portal('municipal-agriculture-office') },
  { name: 'Office of Local Youth Development Office', sourceUrl: portal('community-affairs-and-youth-development-office') },
  { name: 'Office of the Sangguniang Panlungsod', sourceUrl: portal('sangguniang-bayan') },
  { name: 'Office of the City Vice Mayor', sourceUrl: portal('office-of-the-municipal-vice-mayor') },
  { name: 'Office of the City Traffic Management Officer/City Tricycle Franchising and Regulatory Board', sourceUrl: portal('carmona-traffic-management-office-municipal-tricycle-franchising-and-regulatory-board') },
  { name: 'Office of the City Urban Development and Housing Officer', sourceUrl: portal('municipal-urban-development-and-housing-office') },
  { name: 'City Legal Office' },
  { name: 'Pagamutang Bayan ng Carmona', sourceUrl: portal('pagamutang-bayan-ng-carmona') },
  { name: 'Office of the City Gender and Development Officer', sourceUrl: portal('gad') },
  { name: 'Office of the City Population and Development Officer', sourceUrl: portal('office-of-the-city-population-and-development-officer') },
  { name: 'Office of the City Internal Audit Service', sourceUrl: portal('audit') },
  { name: 'Office of the City Public Library and Learning Resource Center', sourceUrl: portal('library') },
];
