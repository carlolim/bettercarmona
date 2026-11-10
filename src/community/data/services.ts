/**
 * City services, as the City of Carmona's Citizen's Charter states them.
 *
 * Text is transcribed from the charter, with line breaks joined, long dashes written as hyphens, and
 * obvious typos corrected (each correction is listed in `corrections`). The charter's "person
 * responsible" column names staff; we give only the office. `npm run build` checks this file
 * (scripts/services-check.ts).
 */
import { Briefcase, Receipt, type LucideIcon } from 'lucide-react';
import type { LocalizedString } from '../Localized';

export interface ServiceSource {
  title: string;
  publisher: string;
  edition: string;
  url: string;
  /** Printed page number = PDF page number - pdfPageOffset. */
  pdfPageOffset: number;
  /** The day the file was downloaded and read. */
  recordedAt: string;
}

export const CITIZENS_CHARTER_2026: ServiceSource = {
  title: "Citizen's Charter 2026",
  publisher: 'City Government of Carmona',
  edition: '1st Edition',
  url: 'https://carmonagov.net/portal/wp-content/uploads/2026/08/CITY-GOVERNMENT-OF-CARMONA_CC_2026.pdf',
  pdfPageOffset: 18,
  recordedAt: '2026-11-08',
};

/** A link to the charter at a printed page. */
export function charterPageUrl(source: ServiceSource, page: number): string {
  return `${source.url}#page=${page + source.pdfPageOffset}`;
}

export interface Requirement {
  text: string;
  /** The charter's "where to secure" column. */
  where?: string[];
  /** Options or parts listed under this requirement. */
  items?: Requirement[];
}

export interface ServiceRow {
  /** The charter's "agency action". Absent where the charter leaves it blank. Line breaks separate parts of one cell. */
  action?: string;
  /** Each line of "fees to be paid". Absent where the charter leaves it blank. */
  fee?: string[];
  /** Each line of "processing time". Absent where the charter leaves it blank. */
  time?: string[];
  /** Where the charter's fee cell spans the steps after this one: how many steps it covers, this one included. Only on a step's last row. */
  feeSteps?: number;
  /** The same, for the time cell. */
  timeSteps?: number;
}

export interface ServiceStep {
  /** A heading the charter prints above this step, starting a separate set of steps. */
  heading?: string;
  /** The charter's "client step". Line breaks separate parts of one cell. */
  client: string;
  rows: ServiceRow[];
}

export interface Service {
  /** Lowercase words joined by hyphens, used in /services/:id. */
  id: string;
  category: string;
  /** The charter's heading, in normal case. */
  title: string;
  /** The heading as published, where `title` corrects it. */
  publishedAs?: string;
  description: string;
  /** "Office or Division". */
  office: string;
  classification: string;
  transactionType: string;
  whoMayAvail: string[];
  requirements: Requirement[];
  /** Where the charter gives one "where to secure" cell for the whole list. */
  requirementsWhere?: string[];
  /** Notes printed with the requirements. */
  notes?: string[];
  steps: ServiceStep[];
  /** The charter's TOTAL row. An empty list means it gives no total fee. */
  total: { fee: string[]; time: string[] };
  /** First and last printed page of the service. */
  pages: [number, number];
  source: ServiceSource;
  /** The city's online system for this service, where the charter names one. */
  online?: { label: LocalizedString; url: string; checkedOn: string };
  /** Things in the charter a reader should know, such as a total that differs from the steps. Shown on the page. */
  caveats?: LocalizedString[];
  /** Typos corrected in this transcription, as "published -> written here". Not shown. */
  corrections?: string[];
}

export interface ServiceCategory {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  /** The office's page on the city's website, from src/community/data/government.ts. Absent where the category spans offices. */
  officeUrl?: string;
  /** The city's own page or system for these services, if any. */
  online?: { label: LocalizedString; url: string; checkedOn: string };
  /** Shown in the category's icon circle. Without one, the page uses FileText. */
  icon?: LucideIcon;
}

/** The city's online business permit system. The charter names it in the eBOSS services; the address is from src/community/data/home-links.ts. */
const EBOSS = {
  label: { en: "eBOSS, the city's online business permit system", fil: 'eBOSS, ang online na sistema ng lungsod para sa business permit' },
  url: 'https://egovcarmona.ph/carmona_bpl/',
  checkedOn: '2026-11-05',
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'civil-registry',
    title: { en: 'Civil registry', fil: 'Civil registry' },
    description: {
      en: 'Registering births, deaths, and marriages, corrections and legitimation, marriage licenses, copies of records, and cemetery and cremation permits. From the Office of the City Civil Registrar.',
      fil: 'Pagpaparehistro ng kapanganakan, pagkamatay, at kasal, mga pagtatama at legitimation, marriage license, mga kopya ng rekord, at mga permit sa sementeryo at cremation. Mula sa Office of the City Civil Registrar.',
    },
    officeUrl: 'https://carmonagov.net/portal/office-of-the-municipal-registrar/',
    online: {
      label: { en: "Civil registry services on the city's website", fil: 'Mga serbisyo ng civil registry sa website ng lungsod' },
      url: 'https://carmonagov.net/portal/civil-registry-services/',
      checkedOn: '2026-11-05',
    },
  },
  {
    id: 'business',
    title: { en: 'Business permits and registration', fil: 'Business permit at rehistro ng negosyo' },
    description: {
      en: "Business permits from the City Treasurer, including online through eBOSS, the zoning and environment clearances a business permit needs, and DTI business name and BMBE registration at LEDIPO's Negosyo Center.",
      fil: 'Mga business permit mula sa City Treasurer, kasama ang online sa eBOSS, ang zoning at environment clearance na kailangan ng business permit, at ang rehistro ng business name sa DTI at ng BMBE sa Negosyo Center ng LEDIPO.',
    },
    online: EBOSS,
    icon: Briefcase,
  },
  {
    id: 'treasury',
    title: { en: "Cedula, tax clearance, and other Treasurer's services", fil: 'Cedula, tax clearance, at iba pang serbisyo ng Treasurer' },
    description: {
      en: 'The community tax certificate (cedula), working permit, professional tax receipt, and tax clearance, from the Office of the City Treasurer.',
      fil: 'Ang community tax certificate (cedula), working permit, professional tax receipt, at tax clearance, mula sa Office of the City Treasurer.',
    },
    officeUrl: 'https://carmonagov.net/portal/municipal-treasurers-office/',
    icon: Receipt,
  },
];

const charter = { source: CITIZENS_CHARTER_2026 };
const lcr = { ...charter, category: 'civil-registry', office: 'Local Civil Registry Office', transactionType: 'G2C - Government to Citizen' };

const NONE = ['None'];
/** One row of the steps table. */
const row = (action: string | undefined, fee?: string | string[], time?: string | string[], spans?: Pick<ServiceRow, 'feeSteps' | 'timeSteps'>): ServiceRow => ({
  ...(action ? { action } : {}),
  ...(fee ? { fee: typeof fee === 'string' ? [fee] : fee } : {}),
  ...(time ? { time: typeof time === 'string' ? [time] : time } : {}),
  ...spans,
});
const req = (text: string, where?: string | string[], items?: Requirement[]): Requirement => ({
  text,
  ...(where ? { where: typeof where === 'string' ? [where] : where } : {}),
  ...(items ? { items } : {}),
});

/** The list of IDs most services print, in its usual order. Some services add more at the end. */
const BASE_IDS = [
  'Social Security System (SSS) Card',
  'Government Service Insurance System (GSIS) Card',
  'Unified Multi-Purpose ID (UMID)',
  "Land Transportation Office (LTO) Driver's License",
  "Voter's Identification Card or Voter's Certificate issued from Commission of Election (COMELEC)",
  'School Identification Card',
  'Professional Regulatory Commission (PRC) ID',
  'PhilHealth Identification Card',
  'Bureau of Internal Revenue (BIR) TIN Identification Card',
  'Postal Identification Card',
  'Company Identification Card',
  'Department of Foreign Affairs Passport',
];
const validIds = (...extra: string[]) =>
  req('Valid Government Identification Card', 'Appropriate Agencies', [...BASE_IDS, ...extra].map((id) => req(id)));

/** Burial, cremation, and viewing permits print the same five requirements. */
const deathPermitRequirements = (family: string) => [
  req('Certified Photo Copy of Certificate of Death', 'Local Civil Registrar'),
  req('Barangay Residency Certification', 'Barangay'),
  req('Valid ID of immediate family', 'Appropriate Agencies'),
  req('Authorization Letter from the immediate family of the deceased, if applicable.', family),
  req('Valid ID of Representative, if applicable', 'Appropriate Agencies'),
  validIds('Philippine National ID', 'Senior ID', 'Persons with Disability ID'),
];

const VIEWING_FEES = [
  'Resident: Free',
  'Resident Non-Registered Voter (1st 3 days) PHP 5,000.00/DAY',
  'Resident, Non-Registered Voter (4th-5th day)',
  '(Extended day- Not exceeding 5 days) PHP 8,000.00/DAY',
  'Resident Registered Voter Extension of not more than 5 days & 4 nights (4th-5th day) PHP 5,000.00/DAY',
];

const CREMATION_FEES = [
  'Crematorium (Fresh Body) PHP 9,000.00',
  'NON-Residents PHP 18,000.00',
  'FREE Resident Registered Voter/Senior Citizen/PWD Residents',
  'Crematorium Bone PHP 5,000.00',
  'NON-Resident PHP 10,000.00',
];

const PETITION_WHO = ['Parents', 'Document owners', 'Attorneys-in-Fact'];
const RA_9048_DESCRIPTION =
  'Authorizes the city/municipal civil registrar or the consul general to correct a clerical error or typographical error in an entry and/or change of first name or nick name in the civil register without need of judicial order.';

// Shared by the business and Treasurer services.
const businessTransaction = 'G2C - Government to Citizen; G2B - Government to Businesses';
const treasurer = { ...charter, office: 'Office of the City Treasurer' };
const ledipo = { ...charter, category: 'business', office: 'Local Economic Development and Investment Promotion Office (LEDIPO)', transactionType: businessTransaction };
const zoning = { ...charter, category: 'business', office: 'Office of the City Zoning Administrator', transactionType: businessTransaction, whoMayAvail: ['All'] };
const ocenro = {
  ...charter,
  category: 'business',
  office: 'Office of the City Environment & Natural Resources Officer (OCENRO)',
  classification: 'Highly Technical',
  transactionType: businessTransaction,
  whoMayAvail: ['All'],
};

const RATES = 'Based on tax, fees and charges (see attached copy of rates)';

const TOTAL_SAYS_NONE: LocalizedString = {
  en: 'The charter\'s total says "None", but a step above lists a fee.',
  fil: 'Nakasulat na "None" ang kabuuan sa charter, pero may bayad sa isa sa mga hakbang sa itaas.',
};
const UNLABELED_TIMES: LocalizedString = {
  en: 'The charter splits some processing times into columns without labels. They are shown here separated by slashes, in the charter\'s order.',
  fil: 'Hinati ng charter ang ilang tagal ng pagproseso sa mga hanay na walang label. Nakahiwalay ang mga ito dito sa pamamagitan ng slash, ayon sa pagkakasunod sa charter.',
};

/** As printed, including its unmatched brackets. */
const RENEWAL_REQUIREMENTS = [
  req('Declaration of Gross Sales/Receipts'),
  req('Previous year BIR Form', undefined, [req('(1702Q/1701Q - 1st to 3rd Quarters'), req('2550M/2551M - October & November')]),
  req('Gross Sales/Receipts or 2550Q/2551Q - December)'),
];

const PTR_FEES = ['1. PHP300.00', '2. Surcharge = 25% of PHP 300.00', '3. Interest = of PHP 300.00 per month'];

const DTI_FEES = [
  'Based on Territorial Scope:',
  'Barangay (₱200.00); City/Municipality (₱500.00); Regional (₱1000.00); National (₱2000.00)',
  'and',
  'Total fees to include:',
  '₱30.00 for Documentary Stamp Tax (DST)',
];
const DTI_TOTAL = ['₱ 230.00;', '₱ 530.00;', '₱ 1,030.00;', 'or ₱ 2,030.00'];

const PROOF_OF_OWNERSHIP =
  'Copy of Transfer Certificate of Title (TCT) / Pro-forma Affidavit / Notarized Deed of Sale / Contract of Lease, or Proof of Ownership, Tax Declaration/ Authority to Move In/ Certificate of Award/ Owners Consent/ Authorization Letter/ Extra Judicial Settlement/ Real Property Tax Receipt';

/** Medium- and high-risk requirements for a new business's OCENRO clearance, which differ only in items 6 and 9. */
const ocenroRiskRequirements = (certificate: string, inspection: string) => [
  req('Development Permit or Development Permit Requirement/s (if deferred) or Lot Plan/ Development Plan', 'Local Government Unit/Proponent'),
  req('Proof of ownership (OCT/TCT/Lease Contract)', 'Local Government Unit'),
  req('Building Permit or Building Permit Requirement/s (if deferred)', 'Local Government Unit/Proponent'),
  req('Certificate of Occupancy or Certificate of Occupancy Requirement/s (if deferred)', 'Local Government Unit/Proponent'),
  req('Locational Clearance/ Zoning Certificate', 'Office of the City Zoning Administrator'),
  req(certificate, 'DENR-EMB 4A'),
  req('DOST-PHIVOLCS Earthquake Hazard Assessment (near identified fault line)', 'DOST-PHIVOLCS'),
  req('Environmental Protection Fee', 'OCENRO'),
  req(inspection, 'OCENRO'),
  req('Other requirements as per assessment:', undefined, [
    req('DENR/LLDA Accredited PCO', 'DENR-EMB 4A/LLDA'),
    req('LLDA Clearance', 'LLDA'),
    req('LLDA Discharge Permit', 'LLDA'),
    req('DENR Permit to Operate (Air Pollution Control Installation)', 'DENR-EMB 4A'),
    req('DENR Hazardous Waste ID', 'DENR-EMB4A'),
    req('NWRB Water Permit', 'National Water Resources Board'),
    req('CWD Certification for Flow Meter Installation', 'Carmona Water District'),
    req('DENR Certificate of Registration as Lumber Dealer/Certificate of Registration as Importer of Lumber and Wood Materials', 'DENR-PENRO Cavite'),
  ]),
];

/** The first five requirements for recycling businesses and motor shops. */
const OCENRO_SITE_REQUIREMENTS = [
  req('Development Permit or Development Permit Requirement/s (if deferred) or Lot Plan/Development Plan', 'Office of the City Zoning Administrator/ Proponent'),
  req('Proof of ownership (OCT/TCT/Lease Contract)', 'Local Government Unit/ Proponent'),
  req('Building Permit or Building Permit Requirement/s (if deferred)', 'Office of the City Building Official/ Proponent'),
  req('Certificate of Occupancy or Certificate of Occupancy Requirement/s (if deferred)', 'Office of the City Building Official/ Proponent'),
  req('Locational Clearance/Zoning Certificate', 'Office of the City Zoning Administrator'),
];

/** The last seven requirements for recycling businesses and motor shops. */
const OCENRO_PERMIT_REQUIREMENTS = [
  req('LLDA Clearance', 'LLDA'),
  req('LLDA Discharge Permit', 'LLDA'),
  req('DENR Permit to Operate (Air Pollution Source and Control Installations)', 'DENR-EMB'),
  req('DENR Hazardous Waste Generator ID', 'DENR-EMB'),
  req('LLDA/DENR Accredited Pollution Control Officer (PCO)', 'LLDA/DENR-EMB'),
  req('Environmental Protection Fee (EPF)', 'OCENRO'),
  req('OCENRO Form No. 014 (Inspection Report)', 'OCENRO'),
];

/** OCENRO's first action, naming its application form, such as "006 New Business Permit Application". */
const ocenroInterview = (form: string) =>
  `Interview Client; instruct to sign in the VISITOR'S LOGBOOK and handout OCENRO Form No.${form} and Client Satisfaction Measurement (CSM) Form\n[Give OCENRO Form No. ${form.trim().slice(0, 3)}; ask client to have it filled out by knowledgeable personnel and return filled out form for evaluation of requirements; Retrieve the unfilled CSM Form]`;
const OCENRO_ASSESS = 'Assess completeness and veracity of requirements. Discuss and agree with client possible schedule of on-site inspection';
const OCENRO_INSPECT = 'Conduct on-site inspection and prepare the OCENRO Form No. 014 (Inspection Report)';
const OCENRO_CSM: ServiceStep = {
  client: 'Completely fill-out the Client Satisfaction Measurement (CSM) Form and place in the designated drop box.',
  rows: [row('Remind client to fill-out the Client Satisfaction Measurement (CSM) Form.', '-', '3 minutes')],
};

/** The steps for recycling businesses and motor shops, which differ only in the form. */
const ocenroNewSteps = (number: string, form: string): ServiceStep[] => [
  { client: 'Provide business information required\n[Client unable to provide requirements]', rows: [row(ocenroInterview(form), '-', '5 minutes')] },
  {
    client: `Check and accomplish OCENRO Form No. ${number} and inquire detailed explanation/ elaboration of requirements`,
    rows: [row('Explain in detail the requirement/s; Inform client that an on-site inspection must be conducted', '-', '2 minutes/ requirement')],
  },
  { client: 'Provide requirements', rows: [row(OCENRO_ASSESS, '-')] },
  { client: 'Assist the OCENRO inspector in conducting the on-site inspection', rows: [row(OCENRO_INSPECT, '-', '60 minutes')] },
  {
    client: 'Client submits complete requirements\nClient submits incomplete requirements',
    rows: [
      row(
        `Provide OCENRO Clearance Certificate No. 003; record and keep OCENRO Form No. ${number}. Ask the client for other concerns and direct them to the necessary office/s, if applicable\nProvide TEMPORARY OCENRO Clearance SUBJECT to submission of required document/s: 3 months: CNC and other clearances 6 months: ECC; Let client sign deferment form.`,
        '-',
        '3 minutes',
      ),
    ],
  },
  OCENRO_CSM,
];

export const SERVICES: Service[] = [
  {
    ...lcr,
    id: 'registration-of-live-birth',
    title: 'Registration of Certificate of Live Birth',
    description: 'This is the process of registering Certificate of Live birth of Filipino Citizen, born in City of Carmona, Cavite, within thirty (30) days from the date of birth.',
    classification: 'Simple',
    whoMayAvail: [
      'All Government/Private Hospitals, maternity & Lying-In Clinic/other birth attendants',
      'Carmona, Cavite Constituents',
      'Non-residents who were born in Carmona, Cavite',
    ],
    requirements: [
      req('1 set of Certificate of Live Birth, duly accomplished (4 Copies)', 'Hospital, Maternity/Lying-In Clinic.'),
      req("Parents' Certificate of marriage (1 original and 2 certified photo copies)", 'Philippine Statistics Authority/ Local Civil Registrar'),
      req('Notarized Affidavit to Use the Surname of the Father, if applicable.', ['Notary Public', 'City Civil Registrar']),
      req('Community Tax Certificate (Sedula)', 'Treasury Office'),
      validIds(),
    ],
    notes: ['For illegitimate child born on March 19, 2004 and above: Personal appearance of the father for acknowledgement of the child in the Certificate of Live Birth.'],
    steps: [
      {
        client: 'Submit duly accomplished Certificate of Live Birth (COLB) and required requirements.',
        rows: [
          row('Receives Certificate of Live Birth for Registration. a. Checks completeness of entries and attachments. b. If complete, Assigns registry number.', NONE, '10 minutes'),
          row('Issue claim stub to the client indicating date and time of release.', NONE, '1 minute'),
          row('Approve and register the document.', NONE, '10 minutes'),
        ],
      },
      { client: 'Present claim stub to window 1 and review carefully the documents received.', rows: [row('Release of document.', NONE)] },
    ],
    total: { fee: ['NONE'], time: ['21 minutes'] },
    pages: [42, 43],
  },
  {
    ...lcr,
    id: 'delayed-registration-of-live-birth',
    title: 'Processing of Delayed Registration of Certificate of Live Birth',
    description:
      'This is the process of registering Certificate of Live Birth of Filipino Citizens, born in City of Carmona, Cavite, after the thirty (30)-days filling period from the date of birth of the person or those who have no existing record in the Register of Births of the Municipality.',
    classification: 'Simple',
    whoMayAvail: ['City of Carmona residence or Non residence was who born in City of Carmona hospital or within the vicinity of City of Carmona.'],
    requirements: [
      req('Mandatory Requirements:', undefined, [
        req('Four copies of the Certificate of Live Birth duly accomplished and signed by the proper parties.', 'Hospital, Maternity/Lying-In Clinic'),
        req('Negative Certification of Birth Record from the Philippine Statistic Authority. (1 Original and 2 Photo copies)', 'Philippine Statistics Office'),
      ]),
      req('Any two (2) Priority Documentary Evidence of Birth: (Declaring the name of parents, date and place of birth of the subject person): (1 Original and 2 Photo Copies)', undefined, [
        req('Baptismal Certificate', 'Parish Church / Religious Sector'),
        req('Barangay Health Record (Bakuna)', 'Health Center'),
        req('School Record (Form 137 A)', 'School'),
        req("Applicant's Marriage Contract (If Applicable)", 'Civil Registrar Office / PSA'),
        req("Voter's Registration Record", 'COMELEC'),
        req('Certification of Attendant at Birth / Birth Institution', 'Attendant of birth / Birth Institution'),
      ]),
      req('Other Supporting Documents', undefined, [
        req('SSS Personal Record', 'SSS'),
        req('PhilHealth MDR', 'PhilHealth'),
        req('PagIbig MDF', 'PagIbig'),
        req('Income tax Return of Applicants / Parents', 'BIR'),
        req('Medical Records', 'Hospital / Health Institution'),
        req('Valid Identification of Registrant', 'Appropriate Agency'),
      ]),
      req('Notarized Joint Affidavit of two disinterested person who might have witnessed or known the birth of the child. (4 original Copies)', 'Notary Public'),
      req('Notarized Affidavit of Facts of Birth (For Out-of-Town Registration)', 'Notary Public'),
      req('Notarized Affidavit to Use the Surname of the Father, sign by the mother (if parents were not married) (Child born on March 19, 2004 up to present) (4 original Copies)', 'Notary Public/ Local Civil Registrar'),
      req('MANDATORY Additional Requirements (PSA Memo 2024-17)', undefined, [
        req('Barangay Certification as proof of Residency.', 'Barangay'),
        req('National ID. If not registered, must be register first; (PhilSys Transaction Slip)', 'PHILSYS / PSA'),
        req('Picture 2x2 size, white background taken within 3 months from the date of registration.', 'Photo Shop'),
        req('Any two (2) documentary evidence showing the identity of the parents:', 'Appropriate Agencies', [
          req('Certificate of Live Birth', 'Civil Registry Office / PSA'),
          req('Government issued ID', 'Any government sector / Appropriate agency'),
          req('Marriage Certificate of parents (If Applicable)', 'Civil Registry Office / PSA'),
          req('Death Certificate for deceased parents', 'Civil Registry Office / PSA'),
        ]),
      ]),
      req('Mandatory Additional Guidelines: (PSA Memo 2024-17)', 'Civil Registry Office / PSA', [
        req('Personal appearance of the applicants (18 years old and above).'),
        req('Personal appearance of the mother or judicially appointed guardians in default of the mother (for non-marital minor) and;'),
        req('If the applicant is not the mother: Affidavit of Sworn Statement stating the present, whereabouts of the mother and the reason for her inability to personally appear before the C/MCR shall be submitted.'),
      ]),
      validIds('Philippine National ID', "Senior Citizen's ID"),
    ],
    notes: ['For illegitimate child: Personal appearance of the father for acknowledgement of the child in Certificate of Live Birth, if applicable.'],
    steps: [
      {
        client: 'Submit duly accomplished Certificates together with requirements:',
        rows: [
          row('Verify from the database subject Birth for the existence or non-existence of record.', NONE, '4 minutes'),
          row('Review and evaluate the supporting documents of the applicant.', NONE, '15 minutes'),
          row('Prepare Certificate of Birth.', NONE, '10 minutes'),
          row('Issue claim stub indicating date and time of release.', NONE, '1 minute'),
          row('Approve, assign register number and register the document after 10 days.', NONE, '10 minutes'),
        ],
      },
      { client: 'Present claim stub to window 1 and review carefully the documents received.', rows: [row('Release of document.', NONE)] },
    ],
    total: { fee: ['NONE'], time: ['40 minutes'] },
    pages: [44, 47],
    corrections: ['Patens -> Parents', '(18 years old and above. -> (18 years old and above).'],
  },
  {
    ...lcr,
    id: 'affidavit-to-use-the-surname-of-the-father',
    title: 'Processing of Affidavit to Use the Surname of the Father (AUSF) R.A. 9255',
    publishedAs: 'Processing of Affidavit to Use the Username of the Father (AUSF) R.A. 9255',
    description: 'The Affidavit to Use the Surname of the Father (AUSF) is executed by the mother or the guardian of the child that allows the use of the surname of the father.',
    classification: 'Simple',
    whoMayAvail: ['All'],
    requirements: [
      req('4 Copies of Certificate of Live Birth', 'Local Civil Registrar'),
      req('Community Tax Certificate of Affiant*', "Treasury's Office"),
      req('Barangay Residency Certification*', 'Barangays'),
      req("Valid Government issued ID (Voter's, Senior Citizen, PWD ID, Valid ID)*", 'Appropriate Agencies'),
      validIds('Philippine National ID'),
    ],
    notes: ['*One original & 1 photo copy'],
    steps: [
      {
        client: 'Submit all requirements for AUSF',
        rows: [row('Interview Affiant', NONE, '5 minutes'), row('Issue Request for OR Slip', NONE, '1 minute'), row('Prepare AUSF', NONE, '10 minutes')],
      },
      { client: 'Pay at the Treasury Office', rows: [row('Receive payment', 'Php 200.00', '3 minutes')] },
      {
        client: 'Go back to Civil Registry Office',
        rows: [
          row('Advise Affiant to claim COLB from their Attendant at Birth', NONE, '2 minutes'),
          row('Prepare and Complete all required documents for AUSF', NONE, '10 minutes'),
          row('Review and Sign accomplished AUSF', NONE, '5 minutes'),
          row('Endorse AUSF documents to Registration Section', NONE, '1 minute'),
        ],
      },
    ],
    total: { fee: ['Php 200.00'], time: ['37 minutes'] },
    pages: [48, 49],
    corrections: ['Username -> Surname, in the heading; the description and requirements say "Surname"'],
  },
  {
    ...lcr,
    id: 'registration-of-death-timely',
    title: 'Registration of Death - Certificate of Death (COD) - Timely',
    description: 'This is the process of registering the Certificates of Death of the constituents whose death occurred in City of Carmona within thirty (30) days from the date of death.',
    classification: 'Simple',
    whoMayAvail: ['City of Carmona residence or Non residence who died in City of Carmona hospital or within the vicinity of City of Carmona Funeral Parlors.'],
    requirements: [
      req('One (1) set of Certificate of Death', 'Hospitals, Funeral Parlors'),
      req('Autopsy Report or Police Report, if applicable', 'PNP-Medico Legal Section'),
      req('Certification of Embalmer', 'Funeral Services'),
    ],
    steps: [
      {
        client: 'Submit duly accomplished Certificate of Death',
        rows: [row('Review Certificate of Death presented for registration', NONE, '5 minutes'), row('Issue Request Slip for OR (Burial/ Transfer)', NONE, '1 minute')],
      },
      {
        client: 'Pay at the Treasury Office and return to the Civil Registry Office',
        rows: [
          row('Receive payment', ['Php 50.00 for burial permit or', 'Php 100.00 for transfer of cadaver']),
          row('Coding and Assigning of Registry Number', NONE, '5 minutes'),
          row('Review, sign and register Certificate of Death', NONE, '3 minutes'),
        ],
      },
      { client: 'Read the Certificate of Death carefully upon receiving', rows: [row('Release of document', NONE, '2 minutes')] },
    ],
    total: { fee: ['Php 50.00 for burial permit or', 'Php 100.00 for transfer of cadaver'], time: ['21 minutes'] },
    pages: [50, 51],
  },
  {
    ...lcr,
    id: 'delayed-registration-of-death',
    title: 'Processing of Delayed Registration of Certificate of Death',
    description:
      'This is the process of registering Certificate of Death of Filipino Citizens, died in City of Carmona, Cavite, after the thirty (30) days filing period from the date of death of the person or those who have no existing record in the Register of Deaths of the municipality.',
    classification: 'SIMPLE',
    whoMayAvail: ['City of Carmona residence or Non residence who died in City of Carmona hospital or within the vicinity of City of Carmona, Funeral Parlors'],
    requirements: [
      req('One (1) set of duly accomplished Certificate of Death for Late registration (4 copies)', 'Hospital, Funeral Parlors'),
      req('Negative Result from PSA (1 original)', 'Philippine Statistic Authority'),
      req('Autopsy Report or Police Report, if applicable', 'PNP-Medico Legal Section'),
      req('Affidavit for Delayed Registration of Death Certificate', 'Legal Office, Notary Public'),
      req('Certificate of No Record', 'Local Civil Registrar'),
    ],
    steps: [
      {
        client: 'Submit duly accomplished Certificates together with complete requirements:',
        rows: [
          row('Verify from the database subject Death for the existence or non-existence of record.', NONE, '4 minutes'),
          row('Review and evaluate the supporting documents of the applicant.', NONE, '15 minutes'),
          row('Prepare Certificate of Death.', NONE, '10 minutes'),
          row('Issue claim stub indicating date and time of release.', NONE, '1 minute'),
          row('Approve, assign registry number and register the document after 10 days.', NONE, '10 minutes'),
        ],
      },
      { client: 'Present claim stub and review carefully documents received.', rows: [row('Release of document.', NONE)] },
    ],
    total: { fee: ['NONE'], time: ['40 minutes'] },
    pages: [52, 53],
  },
  {
    ...lcr,
    id: 'registration-of-marriage-timely',
    title: 'Registration of Certificate of Marriage (COM) - Timely',
    description:
      'For ordinary marriage, the time for submission of the certificate of marriage is 15 days following the solemnization of marriage, while for marriage exempt from license requirement, the prescribed period is 30 days, at the place where the marriage was solemnized.',
    classification: 'Simple',
    whoMayAvail: ['The concerned parties and/ or Solemnizing Officer (who were married or solemnized a wedding at City of Carmona, Cavite)'],
    requirements: [
      req('One (1) set of Certificate of Marriage (4 copies)', 'Provided by the Solemnizing Officer'),
      req('If necessary:', undefined, [
        req('Affidavit of Cohabitation (for Marriage under Art.34)', "Public Attorney's Office, Law Offices, Notary Public"),
        req('Affidavit of Solemnizing Officer (for Marriage under Art.34)', 'Provided by the Solemnizing Officer (back portion of Certificate of Marriage)'),
        req('Marriage License', 'Issued by the Local Civil Registry Office from either one or both the contracting parties place of residence.'),
        req('Certificate of Registration of the Authority to Solemnize Marriage (CRASM)', 'Issued by Philippine Statistics Office (PSA)'),
        req('Approved request for celebration of marriage in a place other than those authorized by law.', 'Provided by the contracting parties with the approval of the Solemnizing Officer'),
        req('Certification from Venue', 'Issued by personnel of the place where the marriage was held.'),
      ]),
    ],
    steps: [
      {
        client: 'Submit duly accomplished Certificate of Marriage',
        rows: [
          row('Review Certificate of Marriage presented for registration', NONE, '5 minutes'),
          row('Issue Claim Stub indicating date and time of release', NONE, '1 minute'),
          row('Receive and review the documents', NONE, '1 minute'),
          row('Coding and Assigning of Registry Number', undefined, '1 minute'),
          row('Review, sign and register Certificate of Marriage', NONE, '3 minutes'),
        ],
      },
      { client: 'Present the claim stub and review the document received', rows: [row('Release of document within 5 days', NONE, '3 minutes')] },
    ],
    total: { fee: ['None'], time: ['21 minutes'] },
    pages: [54, 55],
  },
  {
    ...lcr,
    id: 'delayed-registration-of-marriage',
    title: 'Processing of Delayed Registration of Marriage',
    description:
      'For ordinary marriage, the time for submission of the certificate of marriage is 15 days following the solemnization of marriage, while for marriage exempt from license requirements, the prescribed period is 30 days, at the place where the marriage was solemnized.',
    classification: 'Simple',
    whoMayAvail: ['The concerned parties and /or Solemnizing Officer (who were married or solemnized a wedding at City of Carmona)'],
    requirements: [
      req('One (1) set of duly accomplished Certificate of Marriage', "Local Civil Registrar's Office/Solemnizing Officer"),
      req('Negative Certification from PSA', 'Philippine Statistics Authority'),
      req('Affidavit of 2 disinterested persons', "Public Attorney's Office, Law Offices, Notary Public"),
      req('Government Valid issued ID', 'Appropriate Agencies'),
      req('Community Tax Certificate', "Treasury's Office"),
      req('At least 2 documents showing the correct date and place of occurrence'),
      validIds(),
    ],
    steps: [
      {
        client: 'Submit duly accomplished Certificates of Marriage together with requirements:',
        rows: [
          row('Verify from the database subject Marriage for the existence or non-existence of record', NONE, '4 minutes'),
          row('Review and evaluate the supporting documents of the applicant', NONE, '15 minutes'),
          row('Prepare Certificate of Marriage.', NONE, '10 minutes'),
          row('Approve, assign registry number and register the document after 10 days.', NONE, '10 minutes'),
          row('Issue claim stub indicating date and time of release.', NONE, '1 minute'),
        ],
      },
    ],
    total: { fee: ['NONE'], time: ['40 minutes'] },
    pages: [56, 57],
    corrections: ['non0-existence -> non-existence'],
  },
  {
    ...lcr,
    id: 'burial-at-public-cemetery',
    // The heading spells it "Sanctuario"; the contents page, "Santuario".
    title: 'Burial at Sanctuario De Carmona Public Cemetery',
    description: 'Burial Permit is issued to the immediate family to authorized representative for the proper burial of the deceased.',
    classification: 'Simple',
    whoMayAvail: ['Residents of City of Carmona'],
    requirements: deathPermitRequirements('Immediate Family of the deceased/'),
    steps: [
      {
        client: 'Submit duly accomplished Data Sheet Form together with required requirements.',
        rows: [
          row('Review Death Certificate and Barangay Residency certification and other supporting documents.', NONE, '2 minutes'),
          row('Accomplish Burial Record Form through interview of nearest of kin.', NONE, '5 minutes'),
          row('Issue request slip for OR, if applicable.', NONE, '1 minute'),
        ],
      },
      {
        client: 'Pay at the Treasury Office, if applicable.',
        rows: [
          row('Received payment', ['Php 1,500.00 Internment Fee', 'Php 1,000.00 Niche Rental Fee', 'Php 50.00 - Burial Permit Fee'], '3 minutes'),
          row('Prepare the Burial Permit and Record in the Schedule of Internment.', NONE, '1 minute'),
          row('Prepare/ type Burial Record and Burial Permit Form', NONE, '5 minutes'),
          row('Review and Sign Burial record and burial permit', NONE, '2 minutes'),
        ],
      },
      { client: 'Review of Burial Permit.', rows: [row('Release of Burial Permit.', NONE, '1 minute')] },
      { client: 'Present Burial Permit to SDC Public', rows: [row('Receive Burial Permit prior to Internment.', NONE, '1 minute')] },
    ],
    total: { fee: ['Php 1,500.00 Internment Fee', 'Php 1,000.00 Niche Rental Fee', 'Php 50.00 - Burial Permit Fee'], time: ['21 minutes'] },
    pages: [58, 61],
  },
  {
    ...lcr,
    id: 'cremation-permit',
    title: 'Issuance of Cremation Permit',
    description: 'This is the process of securing cremation permit before the cremation can take place.',
    classification: 'Simple',
    whoMayAvail: ['Residents of City of Carmona'],
    requirements: deathPermitRequirements('Immediate Family of the deceased/'),
    steps: [
      {
        client: 'Submit duly accomplished Data Sheet Form together with the required documents.',
        rows: [
          row('Review the requirements submitted.', NONE, '2 minutes'),
          row('Accomplish Cremation Record Form through interview of nearest kin/authorized representative', NONE, '5 minutes'),
          row('Issue request slip for OR, if applicable.', NONE, '1 minute'),
        ],
      },
      {
        client: 'Pay at the Treasury office, if applicable.',
        rows: [
          row('Received payment', CREMATION_FEES, '3 minutes'),
          row('Prepare the Cremation Permit and Record in the Schedule of Cremation.', NONE, '1 minute'),
          row('Prepare/ type Cremation Permit', NONE, '5 minutes'),
          row('Review and Sign Cremation Permit', NONE, '2 minutes'),
        ],
      },
      { client: 'Present the Cremation Permit to CHP.', rows: [row('Process Cremation.', NONE, '2 minutes')] },
    ],
    total: { fee: CREMATION_FEES, time: ['21 minutes'] },
    pages: [62, 65],
  },
  {
    ...lcr,
    id: 'viewing-permit',
    title: 'Issuance of Viewing Permit',
    description: 'A viewing permit is issued to the immediate family of the deceased for the use of viewing chapels.',
    classification: 'Simple',
    whoMayAvail: ['Residents of City of Carmona'],
    requirements: deathPermitRequirements('Immediate Family of the deceased'),
    steps: [
      {
        client: 'Submit duly accomplished Data Sheet Form together with required requirements.',
        rows: [
          row('Review Death Certificate and Barangay Residency Certificate.', NONE, '2 minutes'),
          row('Accomplish Memorandum of Agreement (MOA) Form through interview of nearest of kin or authorized representative', NONE, '5 minutes'),
          row('Issue request slip for OR', NONE, '1 minute'),
        ],
      },
      {
        client: 'Pay at the Treasury office',
        rows: [
          row('Received payment', VIEWING_FEES, '3 minutes'),
          row('Record in the Schedule of Viewing - date and time of use.', NONE, '1 minute'),
          row('Prepare/type Memorandum of Agreement (MOA)', NONE, '5 minutes'),
          row('Review and Sign Memorandum of Agreement (MOA)', NONE, '2 minutes'),
        ],
      },
      { client: 'Review the Memorandum of Agreement (MOA) to CHP', rows: [row('Release of MOA', NONE, '1 minute')] },
      { client: 'Present MOA to CHP.', rows: [row('Acceptance at the CHP', NONE, '1 minute')] },
    ],
    total: { fee: VIEWING_FEES, time: ['21 minutes'] },
    pages: [66, 70],
  },
  {
    ...lcr,
    id: 'columbarium-permit',
    title: 'Issuance of Columbarium Permit',
    description: 'A columbarium permit is issued to the immediate family of the deceased for the use of columbarium chapels.',
    classification: 'Simple',
    whoMayAvail: ['Residents of City of Carmona'],
    requirements: [
      req('Certified Photo Copy of Certificate of Death', 'Local Civil Registrar'),
      req('Residence Certificate of the Deceased signed by the Barangay Chairman', 'Barangay'),
      req("Voter's Registration Confirmation Signed by Comelec Officer/Representative", 'Appropriate Agencies'),
      req('Senior ID (If applicable)', 'Appropriate Agencies'),
      req('PWD ID (If applicable)', 'Appropriate Agencies'),
      req('Valid Government ID of immediate family', 'Appropriate Agencies'),
      req('Authorization Letter from the immediate family of the deceased, if applicable.', 'Immediate Family of the deceased'),
      validIds('Philippine National ID', 'Senior ID', 'Persons with Disability ID'),
    ],
    steps: [
      {
        client: 'Submit duly accomplished Data Sheet Form together with required requirements',
        rows: [
          row('Review Death Certificate and Barangay Residency Certificate.', NONE, '2 minutes'),
          row('Accomplish Memorandum of Agreement (MOA) Form through interview of nearest of kin or authorized representative.', NONE, '5 minutes'),
          row('Issue request slip for OR', NONE, '1 minute'),
        ],
      },
      {
        client: 'Pay at the Treasury office',
        rows: [
          row('Received payment', ['Resident Non-Registered Voter/ Senior Citizen/PWD) P2,500.00 for 5 years - NO RENEWAL'], '3 minutes'),
          row('Record in the Schedule of Viewing - date and time of use.', NONE, '1 minute'),
          row('Prepare/type Memorandum of Agreement (MOA)', NONE, '5 minutes'),
          row('Review and Sign Memorandum of Agreement (MOA)', NONE, '2 minutes'),
        ],
      },
      { client: 'Review the Memorandum of Agreement (MOA) to CHP', rows: [row('Release of MOA', NONE, '1 minute')] },
      { client: 'Present MOA to CHP.', rows: [row('Acceptance at the CHP', NONE, '1 minute')] },
    ],
    total: { fee: VIEWING_FEES, time: ['21 minutes'] },
    pages: [71, 74],
    caveats: [
      {
        en: "The charter's total for this service lists the viewing permit's fees, which differ from the fee in its payment step. Ask the Civil Registry which applies.",
        fil: 'Ang kabuuan sa charter para sa serbisyong ito ay naglilista ng mga bayad para sa viewing permit, na iba sa bayad sa hakbang ng pagbabayad. Itanong sa Civil Registry kung alin ang tama.',
      },
    ],
  },
  {
    ...lcr,
    id: 'change-of-first-name',
    title: 'Processing Petition for Change of First Name or Nickname (R.A. 9048)',
    description: RA_9048_DESCRIPTION,
    classification: 'Complex',
    whoMayAvail: PETITION_WHO,
    requirements: [
      req('Latest PSA Copy sought to be changed (1 original & 2 photocopies)', 'Philippine Statistics Authority'),
      req('Certified Photocopies of the Certificate of Live Birth (2 copies) as the case maybe.', 'Local Civil Registry Office / Client'),
      req('Clearance from the Authorities - Mandatory requirements (1 original & 2 photocopies)', undefined, [
        req('Employer (If Employed): Certificate of Employment as clearance.', 'Employer of Client'),
        req('If not employed, Affidavit of Non-Employment as clearance.', 'Law Offices'),
        req('NBI and Police Clearance', 'NBI/Police Station'),
      ]),
      req('Baptismal Certificate (1 original & 2 photocopies)', 'Church where he/she is baptized.'),
      req('School Records (1 original & 2 photocopies)', 'School of document owner'),
      req("Voter's Certificate (1 original & 2 photocopies)", 'COMELEC'),
      req('Affidavit of Publisher & News clipping', 'Publication'),
      req('Community Tax Certificate', "Treasurer's Office"),
      req('Certificate of Marriage (if married)', 'PSA/Local Civil Registrar/Church'),
      req('SSS E-1', 'SSS'),
      req('Pag Ibig MDF', 'Pag Ibig'),
      req('PhilHealth MDR', 'PhilHealth'),
      req('Government issued valid ID', 'Appropriate Agencies'),
      validIds(),
    ],
    steps: [
      { client: 'Submit all necessary documents needed in the petition (1 original and 2 certified copies)', rows: [row('Receive and review documents submitted', NONE, '10 minutes')] },
      { client: 'Sign the prepared petition', rows: [row('Issue request slip for Official Receipt', NONE, '1 minute')] },
      {
        client: 'Pay at the Treasury Office',
        rows: [
          row(undefined, ['Php 3,000.00 - Filing Fee', 'Php 1,000.00 - Processing Fee for migrant petition'], '3 minutes'),
          row('Prepare the petition and have it reviewed & signed by petitioner and subscribed and sworn to before the City Civil Registrar', NONE, '20 minutes'),
          row('Explain to the petitioner the flow of petition so as to know how and when they expect the petition to reach its finality', NONE, '5 minutes'),
          row('Prepare all documents to be certified & reviewed by City Civil Registrar', NONE, '20 minutes'),
        ],
      },
      {
        client: 'Interview by City Civil Registrar',
        rows: [
          row('Interview Petitioner', NONE, '10 minutes'),
          row('Order Preparation and Notice of Publication', NONE, '1 minute'),
          row('Prepare and post Notice of Posting at the City Bulletin Board', NONE, '2 minutes'),
          row('Published Notice of Publication in the Local News paper', NONE, 'once a week for two consecutive weeks'),
          row('Receive the Affidavit of Publication and Newspaper clippings', NONE, 'After 3 weeks'),
          row('Act on the petition whether to grant or deny', NONE, '5 minutes'),
          row('Sort out complete set of petitions and mail to PSA Legal Office', NONE, '20 minutes'),
          row("Wait for PSA's action in the petition pursuant to the IRR of RA 9048", NONE, '3 months'),
          row('Receive affirmed/impugned petition from PSA', NONE, '1 minute'),
          row('Prepare Certificate of Finality', NONE, '2 minutes'),
          row('Edit/Sign the complete set of petitions with finality', NONE, '10 minutes'),
          row('Sort out complete set of petitions distributed as follows: 1 for OCRG 1 for petitioner and file copy', NONE, '15 minutes'),
          row('Call or text the petitioner to claim their petition with finality', NONE, '5 minutes'),
        ],
      },
      {
        client: 'Proceed to Civil Registry Office and claim the petition upon receipt of call or text',
        rows: [row('Release of petition with finality', NONE, '2 minutes'), row('Give directions to the petitioner on what to do next', NONE, '3 minutes')],
      },
    ],
    total: {
      fee: ['Php 3,000.00 - Filing Fee', 'Php 1,000.00 - Processing Fee for migrant petition', 'Php 1,500.00 - Publication fee'],
      time: ['Duration of the service: 2 hours and 14 minutes', 'Processing Time: 4 months'],
    },
    pages: [75, 79],
    caveats: [
      {
        en: "The charter's total adds a Php 1,500.00 publication fee that its payment step does not list.",
        fil: 'Ang kabuuan sa charter ay may dagdag na Php 1,500.00 na publication fee na wala sa hakbang ng pagbabayad.',
      },
    ],
  },
  {
    ...lcr,
    id: 'correction-of-clerical-error',
    title: 'Processing Petition for Correction of Clerical Error (R.A. 9048)',
    description: RA_9048_DESCRIPTION,
    classification: 'Complex',
    whoMayAvail: PETITION_WHO,
    requirements: [
      req('PSA Copy sought to be corrected (1 original & 2 photocopies)', 'Philippine Statistics Authority'),
      req('Certified Photocopies of the Certificate of Live Birth as the case maybe', 'Local Civil Registry Office/Client'),
      req('Documents showing the correct entry/entries upon which the correction shall be based. All must be presented in original and 2 photocopies.', undefined, [
        req('Certificate of Live Birth (Wife/Husband, for Marriage Petition)', 'PSA/Local Civil Registry Office'),
        req('Baptismal Certificate', 'Church'),
        req('School Records', 'School of Client'),
        req("Voter's Certificate", 'COMELEC'),
        req('SSS/GSIS Record', 'SSS/GSIS'),
        req('Certificate of Marriage', 'PSA/Civil Registry Office'),
        req('Certificate of Live Birth of Child/children', 'PSA/Civil Registry Office'),
        req('Certificate of Live Birth of the Father, Mother and Siblings', 'PSA/Civil Registry Office'),
        req('Certificate of Marriage of parents if married', 'PSA/Civil Registry Office'),
        req('Valid Identification Card', 'Appropriate Agencies'),
      ]),
      validIds(),
    ],
    steps: [
      { client: 'Submit all necessary documents needed in the petition (1 original and 2 certified copies)', rows: [row('Receive and review documents submitted', NONE, '10 minutes')] },
      { client: 'Sign the prepared petition', rows: [row('Issue request slip for Official Receipt', NONE, '1 minute')] },
      {
        client: 'Pay at the Treasury Office',
        rows: [
          row(undefined, ['Php 1,000.00 - Filing Fee', 'Php 500.00 - Processing Fee for migrant petition'], '3 minutes'),
          row('Prepare the petition and have it reviewed & signed by petitioner subscribed and sworn to before the City Civil Registrar', NONE, '20 minutes'),
          row('Explain to the petitioner the flow of petition so as to know how and when they expect the petition to reach its finality', NONE, '5 minutes'),
          row('Prepare all documents to be certified and reviewed by the City Civil Registrar', NONE, '10 minutes'),
        ],
      },
      {
        client: 'Approach City Civil Registrar for interview',
        rows: [
          row('Interview the petitioner', NONE, '10 minutes'),
          row('Prepare and Post Notice of Posting at the City Bulletin Board', NONE, '2 minutes'),
          row('Act on the petition after 10 days of posting whether to grant or deny', NONE, '5 minutes'),
          row('Sort out complete set of petitions and have it sent to PSA Legal Office through courier', NONE, '20 minutes'),
          row("Wait for PSA's action on the petition", NONE, '4 months'),
          row('Receive affirmed/impugned petition from PSA', NONE, '1 minute'),
          row('Prepare complete set of petition with Certificate of Finality', NONE, '20 minutes'),
          row('Edit/Sign complete set of petition with finality', NONE, '5 minutes'),
          row('Sort out complete set of petition to be distributed as follows: OCRG, Petitioner, File', NONE),
          row('Call or text the petitioner to claim their petition with finality', NONE, '5 minutes'),
        ],
      },
      {
        client: 'Proceed to City Civil Registrar Office and claim the petition upon receipt of call or text',
        rows: [row('Release of petition with finality', NONE, '2 minutes'), row('Give directions to the petitioner on what to do next', NONE, '3 minutes')],
      },
    ],
    total: { fee: ['Php 1,000.00 - Filing Fee', 'Php 500.00 - Processing Fee for migrant petition'], time: ['1 hour and 59 minutes', 'Processing Time: 4 months'] },
    pages: [80, 84],
    corrections: ['Cafrd -> Card'],
  },
  {
    ...lcr,
    id: 'correction-of-sex-or-date-of-birth',
    title: 'Processing Petition for Correction of Sex/Gender/Date of Birth (Day & Month Only) (R.A. 10172)',
    description:
      'An act further authorizing the city/municipal civil registrar or the consul general to correct clerical or typographical errors in the day and month in the date of birth or sex of a person appearing in the civil register without need of judicial order.',
    classification: 'Complex',
    whoMayAvail: ['Parents', "Document's owner", 'Attorneys-in-Fact'],
    requirements: [
      req('One (1) Latest PSA Copy sought to be corrected (1 original & 2 photocopies)', 'Philippine Statistics Authority'),
      req('Certified Photocopies of the Certificate of Live Birth (2 copies)', 'Local Civil Registry Office / Client'),
      req('Employer (If Employed): Certificate of Employment', 'Employer of Client'),
      req('If not employed: Affidavit of Non-Employment', 'Law Offices'),
      req('NBI and Police Clearance: Purpose: for Change of First Name', 'NBI/Police Station'),
      req('Baptismal Certificate (1 original & 2 photocopies)', 'Church of Client'),
      req('Earliest School Records (1 original & 2 photocopies)', 'School of Client'),
      req('Medical Records', 'Clinic/Hospital'),
      req('Medical Certificate from City Health Office that have not undergone sex change or sex transplant (for correction of gender only)', 'City Health Office'),
      req('Certificate of Authenticity of the Certification issued by the City Health Office by the Civil Registrar (for correction of gender only)', 'City Health Office'),
      req("Voter's Certificate (1 original & 2 photocopies)", 'COMELEC'),
      req('Affidavit of Publisher & News clipping', 'Publisher'),
      req('Community Tax Certificate', "Treasury's Office"),
      req('Valid issued government ID showing the gender', 'Appropriate Agencies'),
      validIds('Philippine National ID'),
    ],
    steps: [
      { client: 'Submit all necessary documents needed in the petition (1 original and 2 certified copies)', rows: [row('Receive and review documents submitted', NONE, '10 minutes')] },
      { client: 'Sign the prepared petition', rows: [row('Issue request slip for Official Receipt', NONE, '1 minute')] },
      {
        client: 'Pay at the Treasury Office',
        rows: [
          row(undefined, ['Php 3,000.00 - Filing Fee;', 'Php 500.00- Publication Fee'], '3 minutes'),
          row('Prepare the petition and have it signed by petitioner subscribed and sworn to before the registrar.', NONE, '20 minutes'),
          row('Explain to the petitioner the flow of petition so as to know how and when they expect the petition to reach its finality.', NONE, '5 minutes'),
          row('Prepare all documents to be certified & reviewed by City Civil Registrar', NONE, '20 minutes'),
        ],
      },
      {
        client: 'Interview by City civil Registrar',
        rows: [
          row('Interview Petitioner', NONE, '10 minutes'),
          row('Order Preparation and Notice of Publication', NONE, '1 minute'),
          row('Prepare and post Notice of Posting at the City Bulletin Board', NONE, '2 minutes'),
          row('Published Notice of Publication in the Local News paper', NONE, 'once a week for two consecutive weeks'),
          row('Received the Affidavit of Publication and Newspaper clippings', NONE, 'After 3 weeks'),
          row('Act on the petition whether to grant or deny', NONE, '5 minutes'),
          row('Sort out complete set of petitions and mail to PSA Office', NONE, '20 minutes'),
          row('Received affirmed/impugned petition from PSA', NONE, '1 minute'),
          row('Prepare Certificate of Finality', NONE, '2 minutes'),
          row('Edit/Sign of complete set of petition with finality', NONE, '5 minutes'),
          row('Sort out complete set of petition to be distributed as follows: OCRG, Petitioner, file', NONE, '20 minutes'),
          row('Call or text the petitioner to claim their petition with finality', NONE, '5 minutes'),
        ],
      },
      {
        client: 'Proceed to Civil Registry Office and claim the petition upon receipt of call or text',
        rows: [row('Release of petition with finality and give direction to the petitioner on what to do next', NONE, '2 minutes')],
      },
    ],
    total: { fee: ['Php 3,000.00 - Filing Fee;', 'Php 1,500.00- Publication Fee'], time: ['2 hrs and 12 minutes', 'Processing Time: 4 months'] },
    pages: [85, 89],
    caveats: [
      {
        en: "The charter's total gives the publication fee as Php 1,500.00, while its payment step gives Php 500.00.",
        fil: 'Sa kabuuan ng charter, Php 1,500.00 ang publication fee, pero Php 500.00 ang nasa hakbang ng pagbabayad.',
      },
    ],
  },
  {
    ...lcr,
    id: 'legitimation',
    title: 'Processing of Legitimation',
    description:
      'Legitimation is a remedy by means of which those who in fact were not born in wedlock and should, therefore, be considered illegitimate, are, by fiction considered legitimate, it being supposed that they were born when their parents were already validly married.',
    classification: 'Simple',
    whoMayAvail: ['Parents'],
    requirements: [
      req('For Legitimation with Admission of Paternity And Legitimation including R.A. 9858:', undefined, [
        req('Certificate of No Marriage Record (CENOMAR) of both parents (1 original & 2 photocopies)', 'Philippine Statistics Authority'),
        req('Certificate of Marriage of parents', 'PSA/Local Civil Registrar'),
        req("Child's Certificate of Live Birth", 'PSA/Local Civil registrar'),
        req('Acknowledged/Affidavit of Admission of Paternity (If applicable)', 'Notary Public'),
        req('Affidavit of legitimation executed by both parent.', 'Notary Public/City Civil Registrar'),
      ]),
      req('Additional requirements:', undefined, [validIds()]),
    ],
    notes: ['NOTE: APPEARANCE OF BOTH PARENTS IS REQUIRED'],
    steps: [
      {
        client: 'Submit all requirements for legitimation',
        rows: [
          row('Receive and review documents submitted', NONE, '10 minutes'),
          row('Prepare affidavit of legitimation to be subscribed before the City Civil Registrar', NONE, '10 minutes'),
          row('Issue request slip for Official Receipt', NONE, '1 minute'),
        ],
      },
      { client: 'Pay at the Treasury Office', rows: [row(undefined, 'Php 200.00 - Legitimation Fee', '3 minutes')] },
      {
        client: 'Go back to Civil Registry Office',
        rows: [
          row('Issue claim stub indicating the date and time of release', NONE, '1 minute'),
          row('Prepare and complete the required documents for legitimation', NONE, '20 minutes'),
          row('Review and sign accomplished legitimation', NONE, '5 minutes'),
        ],
      },
      { client: 'Present Claim Stub to "Window 5"', rows: [row(undefined, NONE)] },
      { client: 'Receive and review the document', rows: [row('Release of document (after two days)', NONE, '2 minutes')] },
    ],
    total: { fee: ['Php 200.00 - Legitimation Fee'], time: ['52 minutes'] },
    pages: [90, 92],
    corrections: ['ma rried -> married'],
  },
  {
    ...lcr,
    id: 'marriage-license',
    title: 'Processing of Application for Marriage License',
    description: 'For couple applying for and issuing a Marriage License wherein at least one or both of the contracting party is a resident of City of Carmona, Cavite.',
    classification: 'Simple',
    whoMayAvail: ['Male and Female, 18 years old and above', 'Resident of Carmona (at least one of the Contracting parties)'],
    requirements: [
      req('Two copies of Birth Certificate/Baptismal Certificate of contracting parties (1 Original PSA/1 Photocopy)', 'Local Civil Registrar/PSA/Church'),
      req('Certificate of Seminars from MSWD/MHO/Church', 'City Social Welfare Development Office/City Health Office/Church'),
      req('Signature of parents (Advice) for ages between 21 and 25', 'Notary Public/Local Civil Registrar'),
      req('Signature of Father (Consent) for ages 18 to 21', 'Notary Public/Local Civil Registrar'),
      req('Certificate of No Marriage Record from PSA for ages 25 above', 'PSA'),
      req('Attendance to Orientation on Civil Registration*', 'Local Civil Registrar'),
      req('Cedula Both Parties', 'Treasury Office'),
      req('Legal Capacity, if foreigner', 'Foreign Embassy base in the Philippines'),
      req('1 Valid Government Issued ID', 'Appropriate Agencies'),
      validIds('Philippine National ID'),
    ],
    steps: [
      { client: 'Personal Appearance of applicants for marriage license', rows: [row("Interview and evaluate the applicants' requirements", NONE, '5 minutes')] },
      {
        client: 'Fill-out marriage license application form',
        rows: [
          row(undefined, NONE),
          row('Evaluate and prepare computerized application form', NONE, '20 minutes'),
          row('Subscription of application before the City Civil Registrar', NONE, '10 minutes'),
          row('Issue order of payment', NONE, '1 minute'),
        ],
      },
      {
        client: 'Pay at the Treasury Office',
        rows: [
          row('Receive Payment', ['Php 200.00 - Application Fee', 'Php 2.00 - Marriage License Fee']),
          row('Issue Claim Stub indicating the date and time of release', NONE, '1 minute'),
          row('Prepare and post notice of application', NONE, '10 minutes'),
          row('Evaluate and sign the marriage license', NONE, '10 minutes'),
        ],
      },
      { client: 'Present the Claim Stub to get the document', rows: [row('Release of Marriage License after 10 days of posting', NONE, '1 minute')] },
    ],
    total: { fee: ['Php 200.00 - Application Fee', 'Php 2.00 - Marriage License Fee'], time: ['58 minutes'] },
    pages: [93, 95],
  },
  {
    ...lcr,
    id: 'certified-copies-of-records',
    title: 'Issuance of Copy of Birth, Marriage and Death (Certified Photo Copy)/Certification of Marriage License',
    description:
      'Certified format means that the copy of the document you submit must be certified true to the original, either by the issuer of the document or a recognized authority from the country or territory where the document was issued.',
    classification: 'Simple',
    whoMayAvail: ['All'],
    requirements: [
      req('Fully accomplished Verification Slip', ['From the designated "Officer of the Day" on duty', 'Via CCR Carmona FB page post.']),
      req('Government issued valid ID', 'Appropriate Agencies'),
      validIds('Philippine National ID'),
    ],
    steps: [
      {
        client: 'Fill-out Verification Slip',
        rows: [
          row('Verify from Civil Registry Information System (CRIS)/ hard copy/digital file for the existence or non-existence of record', NONE, ['4 minutes (Birth, Marriage, Death)', '10 Minutes (Marriage License)']),
          row('Issue request slip for Official Receipt', NONE, '1 minute'),
        ],
      },
      {
        client: 'Pay at the Treasury Office, if applicable.',
        rows: [row('Received payment', ['Php 50.00 - Certification fee/Certified Photo Copy fee', 'Php 30.00 - Documentary Stamp Tax fee'], '3 minutes')],
      },
      {
        client: 'Present the Official Receipt',
        rows: [
          row('Get the Official Receipt and Prepare Certification/Certified Photo Copy', NONE, ['3 minutes (Birth, Marriage, Death)', '6 minutes (Marriage License)']),
          row('Review and Sign Document', NONE, '1 minute'),
        ],
      },
      { client: 'Carefully read and review the Certification received.', rows: [row('Release Certification/ CPC with the Official Receipt', NONE, '1 minute')] },
    ],
    total: {
      fee: ['Php 50.00 - Certification fee/CPC fee', 'Php 30.00 - Documentary Stamp Tax fee'],
      time: ['For Marriage License Certification it will take 19 minutes', 'For Birth, Marriage & Death Certification it will take 10 minutes'],
    },
    pages: [96, 98],
  },
  {
    ...lcr,
    id: 'psa-documents-via-breqs',
    title: 'Request of Birth, Marriage, Death and CENOMAR via Batch Request System (BREQS)',
    description:
      'Batch Request Entry System (BREQS) is a scheme where PSA authorizes a partner to receive requests for PSA issued copies and certifications of civil registry documents from the public and issue the documents to its clients.',
    classification: 'Simple',
    whoMayAvail: ['All'],
    requirements: [
      req('Duly Accomplished Request Form', 'From the designated "Officer of the Day" on duty.', [req('White - Birth'), req('Yellow - Death'), req('Green - CENOMAR'), req('Pink - Marriage')]),
      validIds('Philippine National ID', "Senior Citizen's ID", "4P'S ID"),
    ],
    steps: [
      {
        client: 'Fill-out the appropriate request form',
        rows: [row('Screen request form as to its completeness and correctness of entries', NONE, '3 minutes'), row('Issue request slip for Official Receipt', NONE, '1 minute')],
      },
      {
        client: 'Pay at the Treasury Office',
        rows: [
          row(
            'Receive payment',
            [
              'Php 75.00 for all documents re: LGU revenue',
              'Php 60.00 for Senior Citizens, PDAO & 4Ps (20% discount): LGU Revenue',
              'Php 155.00 for PSA Birth, Marriage and Death Certificate',
              'Php 210.00 for PSA CENOMAR',
              'Php 75.00 for all documents re: LGU revenue',
              'Php 60.00 for Senior Citizens, PDAO & 4Ps (20% discount): LGU Revenue',
            ],
            '3 minutes',
          ),
        ],
      },
      {
        client: 'Go back to the Civil Registry Office and present the O.R',
        rows: [
          row('Issue Acknowledgement Receipt indicating the date and time of release.', undefined, '1 minute'),
          row('Encode Request.', NONE, '3 minutes'),
          row('Arrange requests by batch.', NONE, '2 minutes'),
          row('Submit requests together with other required documents and secure payment at PSA Serbilis Outlet/Landbank of the Philippines.', NONE),
          row('Review and sign transmittal letter to PSA Serbilis Outlet', NONE),
          row('Collect required documents or SECPA from PSA Serbilis Outlet', NONE, '2 minutes'),
        ],
      },
      {
        client: 'Present the Claim Stub, valid ID, text message notification of claiming of documents and Authorization Letter, if claimant is not the document owner.',
        rows: [row('Release of documents. For Birth, Marriage Death and CENOMAR Monday to Friday - depending on document availability from PSA Serbilis Outlet', NONE, '2 minutes')],
      },
    ],
    total: { fee: [], time: ['17 minutes'] },
    pages: [99, 102],
  },
  // Office of the City Treasurer. The contents page heads this section "OFFICE OF THE CITY BUDGET OFFICER" by mistake.
  {
    ...treasurer,
    category: 'business',
    id: 'new-business-permit',
    title: 'Issuance of New Business Permit',
    description: 'Given to clients who are engaged in business with complete valid documents and approved clearance.',
    classification: 'Simple/Complex/Highly Technical',
    transactionType: 'G2C - Government to Citizen; G2B - Government to Businesses',
    whoMayAvail: ['Companies, Business Establishments, Entrepreneurs'],
    requirements: [req('SEC/DTI Registration'), req('RPT Payment'), req('Notarized Lease Contract for Lessor.'), req('Barangay Clearance')],
    requirementsWhere: ['Office of the City Treasurer'],
    steps: [
      {
        client: 'Verification Assessment and Payment\n1.1 Get number at front desk and drop complete accomplished application form with attached documentary requirements for verification, assessment and payment.',
        rows: [row('1. Check, verify and assess submitted requirements.\n2. Receive payment', RATES, '20 minutes')],
      },
      { client: 'Claim\n2.1 Wait for processing and Claim Business Permit.', rows: [row('Process and Release Business Permit', '-', '10 minutes')] },
    ],
    total: { fee: ['None'], time: ['30 minutes'] },
    pages: [539, 540],
    caveats: [TOTAL_SAYS_NONE],
  },
  {
    ...treasurer,
    category: 'business',
    id: 'business-permit-renewal',
    title: 'Issuance of Business Permit (Renewal)',
    description: 'Given to clients who are engaged in business with complete valid documents and approved clearance.',
    classification: 'Simple/Complex/Highly Technical',
    transactionType: 'G2C - Government to Citizen; G2B - Government to Businesses',
    whoMayAvail: ['Companies, Business Establishments, Entrepreneurs'],
    requirements: RENEWAL_REQUIREMENTS,
    requirementsWhere: ['Office of the City Treasurer'],
    steps: [
      {
        client: 'Verification Assessment and Payment\n1.1 Get number at front desk and drop complete accomplished application form with attached documentary requirements for verification, assessment and payment.',
        rows: [row('1. Check, verify and assess submitted requirements.\n2. Receive payment', RATES, '20 minutes')],
      },
      { client: 'Claim.\n2.1 Wait for processing and Claim Business Permit.', rows: [row('Process and Release Business Permit', '-', '10 minutes')] },
    ],
    total: { fee: ['None'], time: ['30 minutes'] },
    pages: [541, 542],
    caveats: [TOTAL_SAYS_NONE],
  },
  {
    ...treasurer,
    category: 'business',
    id: 'new-business-permit-eboss',
    title: 'Issuance of New Business Permit (Online eBOSS System)',
    description: 'Application of Business Permit using the Online BOSS System (end-to-end processing).',
    classification: 'Simple/Complex/Highly Technical',
    transactionType: 'G2C - Government to Citizen; G2B - Government to Businesses',
    whoMayAvail: ['Companies, Business Establishments, Entrepreneurs'],
    requirements: [req('SEC/DTI Registration'), req('RPT Payment'), req('Notarized Lease Contract for Lessor'), req('Barangay Clearance')],
    requirementsWhere: ['Office of the City Treasurer'],
    steps: [
      {
        client: 'Log-on to https://egovcarmona.ph/carmona_bpl.\n1.1 Create account and fill-out details in the Unified Application Form\n1.2 Upload documentary requirements.',
        rows: [row('1. Check, verify and assess submitted requirements.\n2. Send Online Assessment to client.', undefined, '10 minutes')],
      },
      {
        client: 'Pay amount due online through the following mode:\n- Bank Transfer\n- Digital Wallet (GCash)\n- Debit Card',
        rows: [row('1. Verify payment.\n2. Print Original Receipt.', RATES, '5 minutes')],
      },
      { client: 'Check eBOSS account for issuance of electronic copy of business permit.', rows: [row('Issue electronic copy of business permit.', undefined, '5 minutes')] },
    ],
    total: { fee: ['NONE'], time: ['20 minutes'] },
    pages: [543, 544],
    online: EBOSS,
    caveats: [TOTAL_SAYS_NONE],
    corrections: ['https://egovcarmona.ph/carmona_ bpl -> https://egovcarmona.ph/carmona_bpl'],
  },
  {
    ...treasurer,
    category: 'business',
    id: 'business-permit-renewal-eboss',
    title: 'Issuance of Business Permit - Renew (Online eBOSS System)',
    description: 'Application of Business Permit using the Online BOSS System (end-to-end processing).',
    classification: 'Simple/Complex/Highly Technical',
    transactionType: 'G2C - Government to Citizen; G2B - Government to Businesses',
    whoMayAvail: ['Companies, Business Establishments, Entrepreneurs'],
    requirements: RENEWAL_REQUIREMENTS,
    requirementsWhere: ['Office of the City Treasurer'],
    steps: [
      {
        client: 'Log-on to https://egovcarmona.ph/carmona_bpl.\n1.1 Create account and fill-out details in the Unified Application Form\n1.2 Upload documentary requirements.',
        rows: [row('3. Check, verify and assess submitted requirements.\n4. Send Online Assessment to client.', undefined, '10 minutes')],
      },
      {
        client: 'Pay amount due online through the following mode:\n- Bank Transfer\n- Digital Wallet (GCash)\n- Debit Card',
        rows: [row('4. Verify payment.\n5. Print Original Receipt.', RATES, '5 minutes')],
      },
      { client: 'Check eBOSS account for issuance of electronic copy of business permit.', rows: [row('6. Issue electronic copy of business permit.', undefined, '5 minutes')] },
    ],
    total: { fee: ['NONE'], time: ['20 minutes'] },
    pages: [545, 546],
    online: EBOSS,
    caveats: [TOTAL_SAYS_NONE],
    corrections: ['https://egovcarmona.ph/carmona_ bpl -> https://egovcarmona.ph/carmona_bpl'],
  },
  {
    ...treasurer,
    category: 'treasury',
    id: 'community-tax-certificate',
    title: 'Issuance of Community Tax Certification',
    description: 'Acceptance of payment and issuance of Community Tax Certificate.',
    classification: 'Simple/Complex',
    transactionType: 'G2C - Government to Citizen; G2B - Government to Businesses; G2G - Government to Government',
    whoMayAvail: ['All'],
    requirements: [req('Gross Income Previous Year/Routing Slip', 'Office of the City Treasurer')],
    steps: [
      {
        client: 'Fill-out information sheet',
        rows: [
          row(
            'Check and verify the information sheet',
            [
              'Basic CTC Tax P10.00',
              'Additional CTC With Gross Receipts derived from business P1.00 for every P1,000.00',
              'Salaries or Gross Receipts - derived from any occupation P1.00 for every P1,000.00',
              'Income from Real Property',
              'Late Payment 2% every month',
            ],
            '1 minute',
            { feeSteps: 2 },
          ),
        ],
      },
      { client: 'Pay the necessary amount, wait and received the Official Receipt (O.R.)', rows: [row('Issue Official Receipt', undefined, '2 minutes')] },
    ],
    total: { fee: ['None'], time: ['3 minutes'] },
    pages: [550, 550],
    caveats: [
      TOTAL_SAYS_NONE,
      {
        en: 'The charter lists "Income from Real Property" among the fees without an amount.',
        fil: 'Nakalista sa charter ang "Income from Real Property" sa mga bayad, pero walang halaga.',
      },
    ],
    corrections: ['verity -> verify'],
  },
  {
    ...treasurer,
    category: 'treasury',
    id: 'working-permit',
    title: 'Issuance of Working Permit',
    description: 'Prepare and release of Working Permit as a requirement in the company.',
    classification: 'Simple',
    transactionType: 'G2C - Government to Citizen',
    whoMayAvail: ['All'],
    requirements: [req('Community Tax Certificate'), req('TIN Number/ SSS Number'), req('1x1 Picture'), req('Routing Slip')],
    requirementsWhere: ['Office of the City Treasurer'],
    steps: [
      { client: 'Fill-out information sheet', rows: [row('Check, verify information sheet', '-', '5 minutes')] },
      { client: 'Process to counter payment', rows: [row('Issue Official Receipt (O.R.)', 'PHP 50.00', '3 minutes')] },
      { client: 'Wait and receive working permit', rows: [row('Process and release working permit')] },
    ],
    total: { fee: ['PHP 50.00'], time: ['11 minutes'] },
    pages: [553, 553],
    corrections: ['verity -> verify'],
  },
  {
    ...treasurer,
    category: 'treasury',
    id: 'professional-tax-receipt',
    title: 'Professional Tax Receipt',
    description: 'Issuance of PTR to professionals that resides or practice their profession within Carmona as a proof of payment of the professional tax.',
    classification: 'Simple',
    transactionType: 'G2C - Government to Citizen',
    whoMayAvail: ['Professionals with Licensed'],
    requirements: [req('Photocopy of Valid PRC License', 'Office of the City Treasurer')],
    steps: [
      { client: 'Present the documents of PRC License and pays the necessary amount.', rows: [row('Check, verify and assess', PTR_FEES, '1 minutes', { feeSteps: 2 })] },
      { client: 'Personnel will check the document, receive the payment and issue official receipts.', rows: [row('Issue Official Receipt', undefined, '3 minutes')] },
    ],
    total: { fee: PTR_FEES, time: ['4 minutes'] },
    pages: [556, 556],
    caveats: [
      {
        en: 'The charter gives the interest as "= of PHP 300.00 per month", without a rate.',
        fil: 'Sa charter, nakasulat ang interest na "= of PHP 300.00 per month", nang walang porsiyento.',
      },
    ],
  },
  {
    ...treasurer,
    category: 'treasury',
    id: 'tax-clearance',
    title: 'Tax Clearance',
    description: 'Certification of the declared owner of the real property and tax payment for the current tax year.',
    classification: 'Simple/Complex/Highly Technical',
    transactionType: 'G2C - Government to Citizen',
    whoMayAvail: ['All'],
    requirements: [
      req('Order of Payment'),
      req('Official Receipt (RPT Payment and Tax Clearance)'),
      req('Additional requirements if the client is not the declared owner:', undefined, [
        req('Special Power of Attorney, ID of the declared owner and client'),
        req('Deed of Sale for transferred ownership'),
      ]),
    ],
    requirementsWhere: ['Office of the City Treasurer'],
    steps: [
      {
        client: 'Present Order of Payment at Windows 11 to 14 for payment.',
        rows: [row('Check, verify and assess', ['PHP 80.00 for Declared Owner', 'PHP 130.00 for other than the Declared Owner'], '1 minutes', { feeSteps: 4 })],
      },
      { client: 'Personnel on Window 11 to 14 will issue Official Receipt.', rows: [row('Issue Official Receipt', undefined, '3 minutes')] },
      { client: 'Present the Official Receipt and other documentary requirements at window 11 to 14.', rows: [row('Check, verify and assess')] },
      { client: 'Personnel will verify and check the documents, process the Tax Clearance, and issue to client.', rows: [row('Check, verify and assess')] },
    ],
    total: { fee: [], time: ['10 minutes'] },
    pages: [557, 557],
  },

  // Local Economic Development and Investment Promotion Office
  {
    ...ledipo,
    id: 'dti-business-name-registration-new',
    title: 'DTI Business Name Registration (New)',
    description:
      'The DTI Business Name Registration is for individuals who wish to register business names, as well as its nature and territorial scope, for Sole Proprietorship. BN Registration is valid for five (5) years. BN Certificate is proof of a successful registration and is one of the requirements for Business Permit Application.',
    classification: 'Highly Technical',
    whoMayAvail: ['General Public'],
    requirements: [
      req('BN Registration form signed by the owner (applicant)', 'LEDIPO - Negosyo Center Carmona'),
      req("Owner's Valid Government Issued ID (original)", 'Applicant'),
      req('IN ABSENCE OF OWNER:', undefined, [
        req('BN Registration Form signed by owner (applicant)', 'LEDIPO - Negosyo Center'),
        req("Owner's Valid Government Issued ID (original)", 'Applicant'),
        req('Authorization Letter of Owner', 'Applicant'),
        req("Representative's Valid ID", 'Applicant'),
      ]),
    ],
    steps: [
      {
        client: 'Submit duly accomplished application',
        rows: [
          row('Review and check submitted application form and requirements.', '-', '2 minutes'),
          row('Check the availability of proposed business names in BNR System.\nProcess online registration of business name', '-', '8 minutes'),
        ],
      },
      {
        client: 'Pay Total Registration Fee.',
        rows: [
          row('Pay transaction thru G-Cash or PayMaya.', DTI_FEES, '2 minutes'),
          row('Print the official receipt and the Certificate of Business Name Registration.', '-', '2 minutes'),
        ],
      },
      { client: 'Check details in the Certificate of Business Name Registration.', rows: [row('Issue the Certificate of Business Name Registration together with the receipt.', '-', '1 minute')] },
    ],
    total: { fee: DTI_TOTAL, time: ['15 minutes'] },
    pages: [514, 515],
    corrections: ['registrati on -> registration'],
  },
  {
    ...ledipo,
    id: 'dti-business-name-registration-renewal',
    title: 'DTI Business Name Registration (Renewal)',
    description:
      'Renewal of DTI Business Name Registration is for business owners who wish to renew the registration of their business names. Renewal of BN Registration is valid for 5 years.',
    classification: 'Highly Technical',
    whoMayAvail: ['General Public'],
    requirements: [
      req('BN Registration form signed by the owner (applicant)', 'LEDIPO - Negosyo Center Carmona'),
      req("Owner's Valid Government Issued ID (original)", 'Applicant'),
      req('Original Copy of expired Certificate of Business Name Registration'),
      req('Tax Identification Number (TIN No.)'),
      req('IN ABSENCE OF OWNER:', undefined, [
        req('BN Registration Form signed by owner (applicant)', 'LEDIPO - Negosyo Center'),
        req("Owner's Valid Government Issued ID (original)", 'Applicant'),
        req('Original Copy of expired Certificate of Business Name Registration'),
        req('Tax Identification Number (TIN No.)'),
        req('Authorization Letter of Owner'),
        req("Representative's Valid ID"),
      ]),
    ],
    steps: [
      {
        client: 'Submit duly accomplished application form and requirements to personnel for validation.',
        rows: [
          row('Review and check submitted application form and requirements.', '-', '2 minutes'),
          row('Process online registration of business name', '-', '4 minutes'),
        ],
      },
      {
        client: 'Pay Total Registration Fee.',
        rows: [
          row('Pay transaction thru G-Cash or PayMaya.', [...DTI_FEES, 'Note: BNR Certificate with 3 months expiration shall pay surcharge fee equivalent to 50% of registration fee.'], '2 minutes'),
          row('Print the official receipt and the Certificate of Business Name Registration.', '-', '1 minute'),
        ],
      },
      { client: 'Check details in the Certificate of Business Name Registration.', rows: [row('Issue the Certificate of Business Name Registration together with the receipt.', '-', '1 minute')] },
    ],
    total: { fee: DTI_TOTAL, time: ['10 minutes'] },
    pages: [516, 517],
  },
  {
    ...ledipo,
    id: 'bmbe-registration',
    title: 'Barangay Micro-Business Enterprise (BMBE) Registration',
    description:
      'BMBE Registration is for any business enterprise engaged in production, processing, or manufacturing of products, including agro-processing, as well as trading and services, with total assets of not more than Php 3 million. Such assets shall include those arising from loans but not the land on which the plant and equipment are located. Registered BMBE can avail of the following incentives: 1. Income tax exemption from income arising from the operations of the enterprise; 2. Exemption from the coverage of the Minimum Wage Law (BMBE employees will still receive the same social security and health care benefits as other employees) 3. Priority to a special credit window set up specifically for the financing requirements of BMBEs; and 4. Technology transfer, production, and management training, and marketing assistance programs for BMBE beneficiaries.',
    classification: 'Complex',
    whoMayAvail: ['Micro, Small and Medium Enterprises (MSMEs)'],
    requirements: [
      req('BN Registration form signed by the owner (applicant)', 'LEDIPO - Negosyo Center Carmona'),
      req("Owner's Valid Government Issued ID (original)", 'Applicant'),
      req('Original Copy of expired Certificate of Business Name Registration', 'Applicant, or Security Exchange Commission; Department of Trade and Industry (DTI); or Cooperative Development Authority (CDA)'),
      req('IN ABSENCE OF OWNER:', undefined, [
        req('Duly accomplished BMBE Application Form 01 and Consent form signed by the owner', 'LEDIPO - Negosyo Center'),
        req('Original Certificate of Business Name Registration', 'Applicant'),
        req('Authorization Letter of Owner'),
        req("Representative's Valid ID"),
      ]),
    ],
    steps: [
      { client: 'Submit duly accomplished application form and consent form and requirements for validation.', rows: [row('Review and check submitted application form and requirements.', '-', '2 minutes')] },
      {
        client: 'Receive claim slip.',
        rows: [
          row('Issue claim slip to the client indicating date of release of BMBE Certificate.', '-', '1 minute'),
          row('Scan and email application form and requirements to DTI Cavite for processing.', undefined, '5 minutes'),
        ],
      },
      { client: 'Present claim slip and review the certificate received.', rows: [row('Print the official receipt and the Certificate of Business Name Registration.', '-', '1 minute')] },
    ],
    total: { fee: ['None'], time: ['10 minutes'] },
    pages: [518, 519],
    corrections: ['agro -processing -> agro-processing', 'th e -> the', 'prod uction -> production'],
  },
  {
    ...ledipo,
    id: 'business-name-certification',
    title: 'Request for Business Name Certification',
    description:
      'Business Name Registration Certification is DTI document being issued to a business owner as a proof of successful registration of his/her Business Name; It can also be issued to any individual requesting for verification of a certain business name registration.',
    classification: 'Complex',
    whoMayAvail: ['Micro, Small and Medium Enterprises (MSMEs)'],
    requirements: [
      req('Duly accomplished Other BN Related Application Form signed by the owner', 'LEDIPO - Negosyo Center Carmona'),
      req('Valid ID of Requesting Individual', 'Applicant'),
    ],
    steps: [
      {
        client: 'Submit duly accomplished application form and requirements to personnel for validation.',
        rows: [row('Review and check submitted application form and requirements.', '-', '1 minute'), row('Process request for certification.', '-', '7 minutes')],
      },
      { client: 'Pay registration fee.', rows: [row('Print certificate and pay transaction thru G-cash or PayMaya.', ['₱ 50.00.', 'Total fees to include ₱30.00 for documentary stamp tax.'], '1 minute')] },
      { client: 'Check details in the certification.', rows: [row('Release of certification.', '-', '1 minute')] },
    ],
    total: { fee: ['None'], time: ['10 minutes'] },
    pages: [520, 520],
    caveats: [TOTAL_SAYS_NONE],
  },

  // Office of the City Zoning Administrator: the clearances a business permit needs.
  {
    ...zoning,
    id: 'locational-clearance-commercial-business',
    title: 'Locational Clearance for Business Permit (Commercial Business)',
    description:
      'Issuance of Locational Clearance to owners/ applicants is to ensure that the commercial business permit being applied is in compliance with the Zoning Ordinance and Comprehensive Land Use Plan.',
    classification: 'Simple',
    requirements: [
      req('Duly Accomplished Application Form (1 Copy)', "BPLO / City Treasurer's Office"),
      req(`${PROOF_OF_OWNERSHIP} (1 Copy)`, "Applicant / Developer / City Assessor's Office / Registry of Deeds"),
      req('DTI Clearance (Department of Trade Industry) (1 Copy)', 'LEDIPO / DTI'),
      req('Barangay Clearance (1 Copy)', 'Barangay Hall'),
    ],
    steps: [
      {
        client: "Present the application form from the Municipal Treasurer's Office",
        rows: [row('1. Review and evaluate the accomplished form.\n2. Interview applicant regarding the location of business.\n3. Prepare and give order of payment.', '-', '5 minutes')],
      },
      {
        client: 'Wait for the ocular inspection of appraisal of the property to be conducted',
        rows: [row('1. Inspect the location of the building.\n2. After inspection, prepare the order of payment and call the applicant for payment.', '-', '40 minutes')],
      },
      { client: "Receive the order of payment form and proceed to the City Treasurer's Office for payment of necessary fees.", rows: [row(undefined, 'Based on Business Capital', '10 minutes')] },
      {
        client: 'Present the receipt to the City Zoning Office.',
        rows: [
          row('Receive receipt and log information of business.', '-', '5 minutes'),
          row('Sign application of Business Permit.', '-', '5 minutes'),
          row('1. Record and approve to system\n2. Release the approved Application form for business.', '-', '4 minutes'),
        ],
      },
      { client: 'Receive signed Application of Business Permit Form (Commercial/ Industrial)', rows: [row('3. Give direction to applicant/ client for the next process', undefined, '1 minute')] },
    ],
    total: { fee: ['*see number 2'], time: ['1 hour and 10 minutes'] },
    pages: [482, 483],
    caveats: [
      {
        en: 'The charter\'s total says "*see number 2" for the fee, but the fee ("Based on Business Capital") is in step 3.',
        fil: 'Sa kabuuan ng charter, nakasulat ang "*see number 2" para sa bayad, pero nasa ikatlong hakbang ang bayad ("Based on Business Capital").',
      },
    ],
  },
  {
    ...zoning,
    id: 'locational-clearance-industrial-business',
    title: 'Locational Clearance for Business Permit (Industrial Business)',
    description:
      'Issuance of Locational Clearance to owners/ applicants is to ensure that the industrial business permit being applied is in compliance with the Zoning Ordinance and Comprehensive Land Use Plan.',
    classification: 'Complex',
    requirements: [
      req('Duly accomplished and notarized application (1 Copy)', 'City Zoning Office'),
      req(`${PROOF_OF_OWNERSHIP} (1 Copy)`, "Registry of Deeds / City Assessor's Office"),
      req('Affidavit of Undertaking (1 Copy)', 'Lawyer'),
      req('Environmental Clearance Certificate (ECC) / Certificate of Non- Coverage (CNC) / Environmental Impact Assessment (EIA) (1 Copy)', 'Department of Environment and Natural Resources (DENR)'),
      req('SEC Registration (1 Copy)', 'Security and Exchange Commission'),
      req('Barangay Clearance (1 Copy)', 'Barangay Hall'),
    ],
    steps: [
      {
        client: 'Ask for an application form and list of requirements.',
        rows: [row('1. Provide application form and list of requirements.', '-', '5 minutes'), row('2. Explain the requirements listed.')],
      },
      { client: 'Fill out and submit duly accomplished application forms and documents.', rows: [row('1. Review and evaluate the accomplished form.\n2. Schedule the inspection.', '-', '13 minutes')] },
      {
        client: 'Wait for the ocular inspection of appraisal of the property to be conducted.',
        rows: [row('1. Inspect the location of the building.\n2. After inspection, prepare the order of payment and call the applicant for payment.', '-', '1 hour and 49 minutes')],
      },
      {
        client: "Get the order of payment from the inspector and proceed to the City Treasurer's Office to pay necessary fees.",
        rows: [row(undefined, '** Depends on capital investment of the corporation', '10 minutes')],
      },
      {
        client: 'Present receipt to the Zoning Office',
        rows: [
          row('Receive receipt and attach it to the documents submitted.', '-', '2 minutes'),
          row('Prepare a draft copy of the Inspection Report.', '-', '5 minutes'),
          row('Review and sign the report.', '-', '5 minutes'),
          row('Prepare final copy and Zoning Certification.', '-', '5 minutes'),
          row('Approve final copy of inspection report and Zoning Certification.', '-', '4 minutes'),
          row('1. Record and approve the system.\n2. Release the approved Application form for business.', '-', '4 minutes'),
        ],
      },
      { client: 'Receive approved Locational Clearance', rows: [row('3. Give direction to applicant/ client for the next process', '-', '1 minute')] },
    ],
    total: { fee: ['*see number 4'], time: ['2 hours and 43 minutes'] },
    pages: [484, 486],
  },
  {
    ...zoning,
    id: 'zoning-clearance-business-permit-renewal',
    title: 'Zoning Clearance for Renewal of Business Permit',
    description:
      'Zoning Clearance for Renewal of business permit is required to ensure that the business permit upon renewal is in compliance with the Zoning Ordinance and Comprehensive Land Use Plan.',
    classification: 'Simple',
    requirements: [
      req(
        'Requirements given by the Business Permit and Licensing Office (BPLO) for renewal of business shall be used as reference for updating, encoding and monitoring purposes. Businesses in the Negative and Pending list must comply and submit updated requirements.',
      ),
    ],
    steps: [
      {
        client: 'Present business renewal form',
        rows: [
          row(
            '1. Check the status of the business for renewal in the system / EBPLS.\n2. If the requirements are complete, sign the application form and approve in system / EBPLS.\n3. Give direction to the applicant/ client for the next process.\n4. If not complete see client step 2.',
            '-',
            '5 minutes',
          ),
        ],
      },
      {
        client: 'Apply and Submit requirements',
        rows: [
          row(
            '1. Check the completeness of requirements and check if the applicant applies to EBPLS.\n2. If the requirements are complete, sign the application form and approve in system / EBPLS.\n3. Give direction to the applicant/ client for the next process.',
            '-',
            '15 minutes',
          ),
        ],
      },
    ],
    total: { fee: ['None'], time: ['20 minutes'] },
    pages: [487, 488],
  },
  {
    ...zoning,
    id: 'zoning-clearance-business-permit-retirement',
    title: 'Zoning Clearance for Retirement of Business Permit',
    description:
      'Zoning Clearance for Retirement of business permit is given to operator/ owner of commercial or industrial establishments if the business will permanently or temporarily terminate its operations.',
    classification: 'Simple',
    requirements: [req('Requirements given by the Business Permit and Licensing Office for retirement of business shall be used as reference for the signing of Retirement / Closure Clearance.')],
    steps: [
      {
        client: 'Present business retirement/ closure form',
        rows: [
          row(
            '1. Check the status of the business in the system/ EBPLS.\n2. Sign the application form and change the status to "Close" and include the date applied for the business retirement/ closure in system/ EBPLS.\n3. Give direction to the applicant/ client for the next process.',
            '-',
            '5 minutes',
          ),
        ],
      },
    ],
    total: { fee: ['None'], time: ['5 minutes'] },
    pages: [489, 489],
  },

  // Office of the City Environment & Natural Resources Officer: the clearances a business permit needs.
  {
    ...ocenro,
    id: 'ocenro-clearance-new-business-permit',
    title: 'OCENRO Clearance for New Business Permit',
    description:
      'The OCENRO Clearance is given to applicants that are applying for new business permit. Such clearance is given after determining the probable environmental impacts of the activities/operations applied for.',
    requirements: [
      req('A. LOW RISK', undefined, [req('Locational/ Zoning Clearance', 'Office of the City Zoning Administrator'), req('Environmental Protection Fee', 'OCENRO')]),
      req('B. MEDIUM RISK', undefined, ocenroRiskRequirements('Certificate of Non-Coverage (CNC)', 'OCENRO Form No. 014 (Inspection Report)')),
      req('C. HIGH RISK', undefined, ocenroRiskRequirements('Environmental Compliance Certificate (ECC)', 'OCENRO Inspection Report')),
    ],
    notes: ['1 xerox/photocopy of each requirement'],
    steps: [
      { client: 'Provide business information required\n[Client unable to provide requirements]', rows: [row(ocenroInterview('006 New Business Permit Application'), '-', '5 minutes')] },
      {
        client: 'Check and accomplish OCENRO Form No. 006 and inquire detailed explanation/ elaboration of requirements',
        rows: [row('Explain in detail the requirement/s; Inform client that an on-site inspection must be conducted for medium and high-risk businesses', '-', '2 minutes/ requirement')],
      },
      { client: 'Provide requirements', rows: [row(OCENRO_ASSESS, '-', '4 min / 32 min / 32 min')] },
      { client: 'Assist the OCENRO inspector in conducting the on-site inspection', rows: [row(OCENRO_INSPECT, '-', '60 minutes')] },
      {
        client: 'Client submits complete requirements',
        rows: [row('Provide OCENRO Clearance Certificate No. 003; record and keep OCENRO Form No. 006. Ask the client for other concerns and direct them to the necessary office/s, if applicable', '-', '3 minutes')],
      },
      {
        client: 'Client submits incomplete requirements',
        rows: [row('Provide TEMPORARY OCENRO Clearance SUBJECT to submission of required document/s: 3 months: CNC and other clearances 6 months: ECC', '-')],
      },
      OCENRO_CSM,
    ],
    total: { fee: ['None'], time: ['12 min / 1 h and 43 min / 1 h and 43 min'] },
    pages: [400, 403],
    caveats: [UNLABELED_TIMES],
    corrections: ['(f deferred) -> (if deferred)', 'Control Installation -> Control Installation)', 'fill-out out -> fill-out'],
  },
  {
    ...ocenro,
    id: 'ocenro-clearance-recycling-business',
    title: 'OCENRO Clearance for New Business Permit (Recycling Business Establishments)',
    description:
      'The OCENRO Clearance (Recycling Business Establishments) is given to recycling business establishments such as junkshops, scrappers and recycling businesses that are applying for new business permit. Such clearance is given after determining the probable environmental impacts of the activities/operations applied for.',
    requirements: [
      ...OCENRO_SITE_REQUIREMENTS,
      req('Neighborhood consent from four (4) or more adjacent or nearest households/ establishments in all directions (Applicants with Zoning under Residential and Commercial Zones)', 'Proponent/Adjacent or nearest households'),
      req('Barangay Certification interposing no objection (Applicants with Zoning under Residential and Commercial Zones)', 'Barangay where the proposed business is located'),
      req('Subdivision/HOA Board Resolution (Applicants located in a subdivision)', 'Subdivision HOA where the proposed business is located'),
      req('DENR Certificate of Non-Coverage (CNC) / Environmental Compliance Certificate (ECC)', 'DENR-EMB'),
      req('DOST-PHIVOLCS Earthquake Hazard Assessment', 'DOST-PHIVOLCS'),
      req('NWRB Water Permit/Bill from Water Service Provider', 'NWRB/ Carmona Water District/ Water Service Provider'),
      ...OCENRO_PERMIT_REQUIREMENTS,
    ],
    notes: ['1 xerox/photocopy of each requirement'],
    steps: ocenroNewSteps('007', '007 New Business Permit Application (Recycling Business Establishments)'),
    total: { fee: ['None'], time: ['1 hour and 43 minutes'] },
    pages: [404, 406],
    corrections: ['fi-out out -> fill-out'],
  },
  {
    ...ocenro,
    id: 'ocenro-clearance-motorshops',
    title: 'OCENRO Clearance for New Business Permit (Motorshops)',
    description:
      'The OCENRO Clearance (Motor shops) is given to motor shops that are applying for new business permit. Such clearance is given after determining the probable environmental impacts of the activities/operations applied for.',
    requirements: [
      ...OCENRO_SITE_REQUIREMENTS,
      req('NWRB Water Permit/ Bill from Water Service Provider', 'NWRB/ Carmona Water District/ Water Service Provider'),
      req('For PETCs: Valid Private Emission Testing Center Accreditation', 'LTO'),
      req('For PETCs: Location map and layout of the center, including dimensions, proximity/location to the nearest LTO District Office', 'Proponent'),
      req('For PETCs: List of all equipment, including manuals, reference materials required for the calibration and tests, manual of the test procedures and personnel', 'Proponent'),
      req('For PETCs: Valid technician authorization or technician accreditation', 'LTO'),
      req('DENR Certificate of Non-Coverage (CNC) / Environmental Compliance Certificate (ECC)', 'DENR-EMB'),
      ...OCENRO_PERMIT_REQUIREMENTS,
    ],
    notes: ['1 xerox/photocopy of each requirement'],
    steps: ocenroNewSteps('008', '008 New Business Permit Application (Motor shops)'),
    total: { fee: ['None'], time: ['1 hour and 43 minutes'] },
    pages: [407, 409],
    corrections: ['(OCT/TCT/Lease Contract -> (OCT/TCT/Lease Contract)', 'fi-out out -> fill-out'],
  },
  {
    ...ocenro,
    id: 'ocenro-clearance-business-permit-renewal',
    title: 'OCENRO Clearance for Renewal Business Permit',
    description:
      'The OCENRO Clearance is given to applicants that are applying for renewal business permit. Such clearance is given after determining the probable environmental impacts of the activities/operations applied for.',
    requirements: [
      req('I. FOR BUSINESSES NOT IN THE NEGATIVE LIST (LOW, MEDIUM, HIGH RISK)', undefined, [
        req('Application through the Electronic Business Permit and Licensing System (EBPLS)'),
        req('Approved Status from the Office of the City Zoning Administrator'),
      ]),
      req(
        "II. FOR BUSINESSES IN THE NEGATIVE LIST (Businesses are placed in the Negative List due to the following: (i) failure to submit documentary requirements in their initial application, (ii) have pending Notice of Violation issued by the LGU or any National Agencies (e.g. DENR-EMB, LLDA, NWRB), (iii) have pending complaints thru the Citizen's Complaint Hotline, or from the OCENRO, (iv) expired documentary requirements initially submitted.",
        undefined,
        [
          req('A. LOW RISK', undefined, [
            req('Completely filled up Business Permit Application Form', 'Office of the City Treasurer/Proponent'),
            req('Locational Clearance/ Zoning Certificate', 'Office of the City Zoning Administrator'),
            req('Environmental Protection Fee', 'OCENRO'),
          ]),
          req('B. MEDIUM AND HIGH RISK', undefined, [
            req('Completely filled up Business Permit Application', 'Office of the City Treasurer/Proponent'),
            req('Locational Clearance/ Zoning Certificate', 'Office of the City Zoning Administrator'),
            req('Certificate of PCO Accreditation (DENR/LLDA)', 'DENR-EMB4A/LLDA'),
            req('Water bills/readings for the last three (3) months', 'Water Service Provider'),
            req('LLDA Discharge Permit', 'LLDA'),
            req('Latest effluent sampling results (if with WWTF)', 'DENR-Recognized Environmental Laboratories'),
            req('Certificate of Septic Tank Siphoning/Septic Sludge', 'OCENRO-registered septic waste haulers'),
            req('DENR Permit to Operate (PTO) for Air Pollution Source and Control Installations', 'DENR-EMB 4A'),
            req('Latest ambient air and/or stack emission test results', 'DENR-Recognized Environmental Laboratories'),
            req("DENR Hazardous Waste Generator's ID", 'DENR-EMB 4A'),
            req('MOA with OCENRO-registered hazardous waste transporter', 'Proponent'),
            req('Latest certificate of hazardous waste treatment/disposal, manifest form, Permit to Transport (PTT)', 'DENR-EMB 4A'),
            req('MOA with OCENRO-registered residual waste transporter/Trip tickets', 'Proponent'),
            req('DENR Certificate of Registration as Lumber Dealer/Certificate of Registration as Importer of Lumber and Woods Materials', 'DENR-PENRO Cavite'),
            req('Chemical Control Order (CCO) Registration Certificate/ Priority Chemical List (PCL) Compliance Certificate or Exemption/ Small Quantity Importation (SQI) Clearance', 'DENR-EMB 4A'),
            req('Latest Self-Monitoring Report (DENR & LLDA)/ Compliance Monitoring Report', 'Proponent'),
            req('Proof of proper solid waste management (segregation, storage, and labelling)', 'Proponent'),
            req('Proof of proper hazardous waste storage and labelling', 'Proponent'),
            req('Proof of CCTVSS installation at pollution control facilities', 'Proponent'),
          ]),
        ],
      ),
    ],
    notes: ['1 xerox/photocopy of each requirement'],
    steps: [
      {
        heading: 'I. FOR BUSINESSES NOT IN THE NEGATIVE LIST\nFOR LOW-RISK BUSINESSES',
        client: 'Applicant applies renewal of business permit through the EBPLS',
        rows: [
          row(
            "Interview Client; instruct to sign in the VISITOR'S LOGBOOK\nOCENRO checks the EBPLS for renewal application and checks if an applicant is in the negative list.",
            ['EPF', 'LOW: Php 1,000.00', 'MEDIUM: Php 3,000.00', 'HIGH: Php 5,000.00'],
            '5 minutes',
          ),
          row('If applicant is not in the negative list, encode applicable Environmental Protection Fee and select APPROVE status for OCENRO Clearance in the EBPLS'),
        ],
      },
      {
        heading: 'I. FOR BUSINESSES IN THE NEGATIVE LIST (MEDIUM and HIGH-RISK BUSINESSES)',
        client: 'Provide business information required',
        rows: [
          row(
            "Interview Client; instruct to sign in the VISITOR'S LOGBOOK\nOCENRO checks the EBPLS for renewal application and checks if an application is in the negative list\nIf an applicant is in the negative list, handout OCENRO Form No. 009 Renewal Business Permit Application and Client Satisfaction Measurement (CSM) Form",
            '-',
            '5 minutes',
          ),
        ],
      },
      { client: 'Check and accomplish OCENRO Form No. 009 and inquire detailed explanation/ elaboration of requirements', rows: [row('Explain in detail the requirement/s;', '-', '2 minutes/ requirement')] },
      {
        client: 'Provide requirements',
        rows: [row('Assess completeness and veracity of requirements. If lacking document/s, ask client to submit a Request Letter for Issuance of Temporary OCENRO Clearance for Business Permit', '-', '16 min / 30 min')],
      },
      {
        client: 'Client submits complete requirements\nClient submits incomplete requirements',
        rows: [
          row(
            'Provide OCENRO Clearance Certificate No. 003; record and keep OCENRO Form No. 009; Update status on the EBPLS. Ask the client for other concerns and direct them to the necessary office/s, if applicable\nProvide TEMPORARY OCENRO Clearance valid for 3 months SUBJECT to submission of required document/s:\nOCENRO updates the status of the applicant in the EBPLS and marks it as TEMPORARY.',
            '-',
            '3 minutes',
          ),
        ],
      },
      OCENRO_CSM,
    ],
    total: { fee: ['None'], time: ['27 min / 41 min'] },
    pages: [410, 413],
    caveats: [TOTAL_SAYS_NONE, UNLABELED_TIMES],
    corrections: ['fi-out out -> fill-out'],
  },
  {
    ...ocenro,
    id: 'ocenro-clearance-business-permit-retirement',
    title: 'OCENRO Clearance for Retirement Business Permit',
    description:
      'The OCENRO Clearance is given to applicants that are applying for retirement of their business permit. Such clearance is given after determining the probable environmental impacts of the activities/operations applied for.',
    requirements: [
      req('Completely filled up Business Permit Application', 'Local Government Unit/Proponent'),
      req('Locational Clearance/Zoning Certificate', 'Office of the City Zoning Administrator'),
      req('Closure and Rehabilitation Plan', 'Developer/Proponent'),
      req('Clean-up Documentation', 'Developer/Proponent'),
      req('Solid Waste Disposal', 'Developer/Proponent'),
      req('Hazardous Waste Disposal', 'Developer/Proponent'),
      req('Wastewater Treatment and Disposal (on-site and off-site)', 'OCENRO'),
      req('OCENRO Form No. 014 (Inspection Report)', 'OCENRO'),
    ],
    notes: ['1 xerox/photocopy of each requirement'],
    steps: [
      { client: 'Provide business information required\n[Client unable to provide requirements]', rows: [row(ocenroInterview(' 011 Retirement of Business Permit Application'), '-', '5 minutes')] },
      {
        client: 'Check OCENRO Form No. 011 and inquire detailed explanation/ elaboration of requirements',
        rows: [row('Explain in detail the requirement/s; Inform client that an on-site inspection must be conducted for medium and high-risk businesses', '-', '2 minutes/ requirement', { timeSteps: 2 })],
      },
      { client: 'Provide requirements', rows: [row(OCENRO_ASSESS, '-')] },
      { client: 'Assist the OCENRO inspector in conducting the on-site inspection', rows: [row(OCENRO_INSPECT, '-', '60 minutes')] },
      {
        client: 'Client submits complete requirements\nClient submits incomplete requirements',
        rows: [
          row(
            'Sign Business Permit Retirement Form; record and keep OCENRO Form No. 011; Ask the client for other concerns and direct them to the necessary office/s, if applicable\nProvide copy of OCENRO Form No. 011 to client with REMARKS: INCOMPLETE REQUIREMENTS APPLICATION CANNOT BE PROCESSED',
            '-',
            '3 minutes',
          ),
        ],
      },
      OCENRO_CSM,
    ],
    total: { fee: ['None'], time: ['Low Risk: 11 min', 'Medium and High Risk: 1 h and 27 min'] },
    pages: [414, 416],
    corrections: ['the second "Client submits complete requirements" -> "Client submits incomplete requirements", as its office action shows', 'fi-out out -> fill-out'],
  },
];

export function serviceById(id: string | undefined): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
