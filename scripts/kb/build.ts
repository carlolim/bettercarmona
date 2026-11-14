/**
 * Builds the search documents in .kb/ from the site's own data and the ordinance files, with
 * .kb/kb-index.json, which gives each document its title, kind, and links, and .kb/glossary.json,
 * for expanding questions. Runs at the start of npm run build.
 *
 *   npm run kb:build
 *
 * The site's data files are imported, never copied: a service added to services.ts gets its
 * document on the next build.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { argv } from 'node:process';
import { pathToFileURL } from 'node:url';
import { BARANGAY_OFFICIALS_URL, BARANGAYS, BARANGAYS_RECORDED_AT, type Barangay } from '../../src/community/data/barangays.ts';
import { OFFICES, OFFICES_URL, OFFICES_RECORDED_AT, OFFICIALS, OFFICIALS_RECORDED_AT, OFFICIALS_URL, type Office } from '../../src/community/data/government.ts';
import { HOTLINES, hotlineId, HOTLINES_RECORDED_AT, type Hotline } from '../../src/community/data/hotlines.ts';
import {
  charterPageUrl, CITIZENS_CHARTER_2026, SERVICE_CATEGORIES, SERVICES, type Requirement, type Service,
} from '../../src/community/data/services.ts';
import { OFFICIAL_PORTAL_URL } from '../../src/community/links.ts';
import en from '../../src/community/locales/en.json' with { type: 'json' };
import fil from '../../src/community/locales/fil.json' with { type: 'json' };
import { loadManifest, ROOT, yearOf } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';
import { ordinanceFiles, splitFile } from './validate.ts';

export const KB = join(ROOT, '.kb');
export const INDEX = join(KB, 'kb-index.json');
const CHARTER_INDEX = join(ROOT, 'knowledge/charter/index-2026.json');
const GLOSSARY = join(ROOT, 'knowledge/keywords/glossary.json');
const SERVICE_KEYWORDS = join(ROOT, 'knowledge/keywords/services.json');
/** An ordinance longer than this is split into parts at its sections, to stay under the validator's 60,000 characters. */
const PART_SIZE = 45_000;
/** At most this many glossary terms are added to one document's "Also asked as" line. */
const GLOSSARY_LIMIT = 24;

export interface IndexEntry {
  title: string;
  kind: string;
  site_url?: string;
  source_url?: string;
  source_label: string;
  date: string | null;
  sb_id?: number;
  number_printed?: string | null;
  year?: number;
  status?: string;
  coverage?: string;
  reviewed?: boolean;
  language?: string;
}

export interface KbIndex {
  version: string;
  documents: Record<string, IndexEntry>;
}

interface Doc extends IndexEntry {
  path: string;
  /** The "Source:" part of the header. */
  sourceLine: string;
  /** Header lines after "Kind" and "Source", such as an ordinance's dates. */
  details?: string[];
  keywords: { en: string[]; fil: string[] };
  body: string;
}

export interface GlossaryEntry {
  topic: string;
  everyday: string[];
  official: string[];
}

const KIND_LABEL: Record<string, string> = {
  service: 'City service',
  'service-list': 'List of city services',
  'charter-index': "Citizen's Charter service not yet on this site",
  ordinance: 'Ordinance, full text',
  'ordinance-summary': 'Ordinance, summary only',
  'ordinance-titles': 'Ordinance, title only (not yet transcribed)',
  hotline: 'Hotline',
  'hotline-list': 'List of hotlines',
  office: 'City office',
  officials: 'Elected officials',
  barangay: 'Barangay',
  'barangay-list': 'List of barangays',
  about: 'About this site',
};

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const unique = (list: string[]) => [...new Map(list.filter(Boolean).map((w) => [w.toLowerCase(), w])).values()];
const charter = CITIZENS_CHARTER_2026;
const charterLabel = `${charter.publisher}, ${charter.title}, ${charter.edition}`;

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

// Services

function requirementLines(list: Requirement[], depth = 0): string[] {
  const lines: string[] = [];
  for (const r of list) {
    const where = r.where?.length ? ` (${en.services.where} ${r.where.join('; ')})` : '';
    lines.push(`${'  '.repeat(depth)}- ${r.text}${where}`);
    if (r.items) lines.push(...requirementLines(r.items, depth + 1));
  }
  return lines;
}

function serviceBody(s: Service): string {
  const category = SERVICE_CATEGORIES.find((c) => c.id === s.category);
  const lines = [
    s.description,
    '',
    `Category: ${category?.title.en ?? s.category}`,
    `${en.services.office}: ${s.office}`,
    `${en.services.classification}: ${s.classification}`,
    `${en.services.transactionType}: ${s.transactionType}`,
    `${en.services.whoMayAvail}:`,
    ...s.whoMayAvail.map((w) => `- ${w}`),
    '',
    `## ${en.services.requirements}: ${s.title}`,
    ...requirementLines(s.requirements),
  ];
  if (s.requirementsWhere?.length) lines.push(`${en.services.whereAll} ${s.requirementsWhere.join('; ')}`);
  for (const n of s.notes ?? []) lines.push(`Note: ${n}`);
  lines.push('', `## ${en.services.steps}: ${s.title}`);
  s.steps.forEach((step, i) => {
    if (step.heading) lines.push(`${step.heading}`);
    lines.push(`${i + 1}. ${en.services.you} ${step.client.replaceAll('\n', ' ')}`);
    for (const r of step.rows) {
      const cost = [
        r.fee?.length ? `${en.services.fee}: ${r.fee.join('; ')}` : '',
        r.time?.length ? `${en.services.time}: ${r.time.join('; ')}` : '',
      ].filter(Boolean).join('; ');
      const action = r.action ? `${en.services.theOffice} ${r.action.replaceAll('\n', ' ')}` : '';
      if (action || cost) lines.push(`   - ${[action, cost && `(${cost})`].filter(Boolean).join(' ')}`);
    }
  });
  lines.push('', `## ${en.services.total}: ${s.title}`);
  lines.push(`${en.services.fees}: ${s.total.fee.length ? s.total.fee.join('; ') : en.services.noTotalFee}`);
  lines.push(`${en.services.time}: ${s.total.time.join('; ')}`);
  if (s.online) lines.push('', `Online: ${s.online.label.en}, ${s.online.url}`);
  if (s.caveats?.length) {
    lines.push('', 'Notes from BetterCarmona (not from the charter):');
    for (const c of s.caveats) lines.push(`- ${c.en}`);
  }
  lines.push('', en.services.checkFirst);
  return lines.join('\n');
}

function serviceDocs(keywords: Record<string, { en: string[]; fil: string[] }>): Doc[] {
  const docs: Doc[] = SERVICES.map((s) => ({
    path: `services/${s.id}.md`,
    title: s.title,
    kind: 'service',
    site_url: `/services/${s.id}`,
    source_url: charterPageUrl(s.source, s.pages[0]),
    source_label: `${s.source.title}, page ${s.pages[0]}`,
    date: s.source.recordedAt,
    sourceLine: `${s.source.publisher}, ${s.source.title}, ${s.source.edition}, printed pages ${s.pages[0]} to ${s.pages[1]}, recorded ${s.source.recordedAt}`,
    keywords: keywords[s.id] ?? { en: [], fil: [] },
    body: serviceBody(s),
  }));
  const list: string[] = [];
  for (const c of SERVICE_CATEGORIES) {
    const services = SERVICES.filter((s) => s.category === c.id);
    if (!services.length) continue;
    list.push(`## ${c.title.en}`, c.description.en, '');
    for (const s of services) list.push(`- ${s.title}. ${s.office}, charter page ${s.pages[0]}. On this site: /services/${s.id}`);
    list.push('');
  }
  docs.push({
    path: 'services/_all.md',
    title: 'City services on BetterCarmona',
    kind: 'service-list',
    site_url: '/services',
    source_url: charter.url,
    source_label: charter.title,
    date: charter.recordedAt,
    sourceLine: `${charterLabel}, recorded ${charter.recordedAt}`,
    keywords: { en: ['city services', 'list of services', 'what services', 'requirements', 'fees'], fil: ['mga serbisyo ng lungsod', 'listahan ng serbisyo', 'anong serbisyo', 'mga requirement'] },
    body: list.join('\n').trim(),
  });
  return docs;
}

// The charter's own list of services, for those not yet on the site

interface CharterEntry {
  number: string;
  title: string;
  office: string;
  page: number;
  part_of?: string;
}

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));

/** True when a service in SERVICES is this charter entry: the same first page, and most title words shared. */
export function isOnSite(e: CharterEntry, services: Service[] = SERVICES): boolean {
  return services.some((s) => {
    if (s.pages[0] !== e.page) return false;
    const a = words(e.title);
    const b = words(s.title);
    const shared = [...a].filter((w) => b.has(w)).length;
    return shared / Math.max(1, Math.min(a.size, b.size)) >= 0.6;
  });
}

/**
 * One small document per charter service not yet on the site. One document per service, not a list
 * of 25, because search ranks a short document about one thing far above a line inside a long one.
 */
function charterIndexDocs(): Doc[] {
  const entries = readJson<{ services: CharterEntry[] }>(CHARTER_INDEX, { services: [] }).services.filter((e) => !isOnSite(e));
  const docs: Doc[] = [];
  const paths = new Set<string>();
  for (const e of entries) {
    const name = e.part_of ? `${e.part_of}: ${e.title}` : e.title;
    let path = `charter-index/${e.page}-${slug(e.title).split('-').slice(0, 6).join('-')}.md`;
    for (let n = 2; paths.has(path); n++) path = path.replace(/(-\d+)?\.md$/, `-${n}.md`);
    paths.add(path);
    docs.push({
      path,
      title: `${name} (Citizen's Charter, page ${e.page})`,
      kind: 'charter-index',
      source_url: charterPageUrl(charter, e.page),
      source_label: `${charter.title}, page ${e.page}`,
      date: charter.recordedAt,
      sourceLine: `${charterLabel}, list of services, recorded ${charter.recordedAt}`,
      keywords: { en: [], fil: [] },
      body: [
        `${name} is a service of the City Government of Carmona, from the ${e.office}.`,
        `The Citizen's Charter 2026 describes it on page ${e.page}: ${charterPageUrl(charter, e.page)}`,
        'BetterCarmona does not describe this service yet. The charter page has the details.',
      ].join('\n'),
    });
  }
  return docs;
}

// Ordinances

interface Front {
  sb_id: number;
  coverage: 'full' | 'summary';
  number_printed: string | null;
  number_listed: string | null;
  year: number;
  title: string;
  title_en?: string;
  language: string;
  issuing_body: string | null;
  date_enacted: string | null;
  date_approved: string | null;
  category: string;
  status: string;
  summary_en: string;
  summary_fil: string;
  keywords_en: string[];
  keywords_fil: string[];
  key_facts?: { label: string; value: string; page: number }[];
  source: { page_url: string; file_url: string; fetched_at: string };
  transcription: { reviewed: boolean };
}

/**
 * Splits text into parts of at most `size` characters, between sections where it can. A cut goes
 * before the line above each `##` heading, which names the ordinance, so that line stays with it.
 */
export function splitAtSections(text: string, size = PART_SIZE): string[] {
  if (text.length <= size) return [text];
  const sections = text.split(/\n(?=[^\n]*\n## )/);
  const parts: string[] = [];
  let current = '';
  for (const section of sections) {
    if (current && current.length + section.length + 1 > size) {
      parts.push(current);
      current = section;
    } else {
      current = current ? `${current}\n${section}` : section;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** The pandemic-era pattern from priorities.json, which also sends these ordinances to the end of the transcription queue. */
const PANDEMIC = (() => {
  const p = readJson<{ defer?: { pattern: string } }>(join(ROOT, 'knowledge/sources/priorities.json'), {}).defer?.pattern;
  return p ? new RegExp(p, 'i') : undefined;
})();
/** Added to a pandemic-era ordinance's header, so an answer from it says when it was made. Taken from its title only. */
export const PANDEMIC_LINE =
  'Pandemic-era: its title refers to COVID-19, quarantine, or face masks, so it was made for the COVID-19 emergency. Rules made for the pandemic may no longer apply.';

function ordinanceDocs(): Doc[] {
  return ordinanceFiles().flatMap((path) => {
    const { front, body } = splitFile(readFileSync(path, 'utf8'));
    const f = front as unknown as Front;
    const label = `${f.number_printed ? `No. ${f.number_printed}` : 'Ordinance'} (${f.year})`;
    const details = [
      `Number: ${f.number_printed ?? 'not printed'}${f.number_listed && f.number_listed !== f.number_printed ? `, listed in the library as ${f.number_listed}` : ''}. Year: ${f.year}. Category: ${f.category}.`,
      `Issued by: ${f.issuing_body ?? 'not stated'}. Enacted: ${f.date_enacted ?? 'not stated'}. Approved: ${f.date_approved ?? 'not stated'}.`,
      `Status: ${f.status === 'unverified' ? 'not verified; it may have been amended or repealed' : f.status}. ${f.transcription.reviewed ? 'The transcription was checked against the scan.' : 'The transcription has not been checked yet.'}`,
    ];
    if (f.title_en) details.push(`Title in English: ${f.title_en}`);
    if (PANDEMIC?.test(`${f.title} ${f.title_en ?? ''} ${f.summary_en}`)) details.push(PANDEMIC_LINE);
    const summary = ['Summary (not part of the ordinance):', f.summary_en, '', f.summary_fil].join('\n');
    let text: string;
    if (f.coverage === 'summary') {
      const facts = (f.key_facts ?? []).map((k) => `- ${k.label}: ${k.value} (page ${k.page})`);
      text = [summary, '', 'Key facts, as printed:', ...facts, '', `The full text is not transcribed. It is in the scan: ${f.source.file_url}`].join('\n');
    } else {
      const marker = `${f.number_printed ?? 'Ordinance'} (${f.year}), ${f.title}`;
      const ordinance = body
        .replace(/<!-- page (\d+) -->/g, '[Page $1]')
        .split('\n')
        .flatMap((line) => (line.startsWith('## ') ? [marker, line] : [line]))
        .join('\n')
        .trim();
      text = [summary, '', 'The ordinance, word for word:', '', ordinance].join('\n');
    }
    const doc: Doc = {
      path: `ordinances/${f.sb_id}.md`,
      title: `${label}: ${f.title}`,
      kind: f.coverage === 'summary' ? 'ordinance-summary' : 'ordinance',
      site_url: `/ordinances/${f.sb_id}`,
      source_url: f.source.page_url,
      source_label: 'Carmona SB Office ordinance library',
      date: f.date_enacted ?? String(f.year),
      sb_id: f.sb_id,
      number_printed: f.number_printed,
      year: f.year,
      status: f.status,
      coverage: f.coverage,
      reviewed: f.transcription.reviewed,
      language: f.language,
      sourceLine: `Carmona SB Office ordinance library, item ${f.sb_id}, fetched ${f.source.fetched_at}`,
      details,
      keywords: { en: f.keywords_en, fil: f.keywords_fil },
      body: text,
    };
    const parts = splitAtSections(text);
    if (parts.length === 1) return [doc];
    return parts.map((body, i) => ({
      ...doc,
      path: i ? `ordinances/${f.sb_id}-part-${i + 1}.md` : doc.path,
      title: `${doc.title} (part ${i + 1} of ${parts.length})`,
      body: i ? `${summary}\n\nThe ordinance, continued:\n\n${body}` : body,
    }));
  });
}

/**
 * One small document per library item not yet transcribed, with its listed number, title, and the
 * library's description. One per item, not a list per category, so a title can be found on its own.
 */
function ordinanceTitleDocs(transcribed: Set<number>): Doc[] {
  const m = loadManifest(LIBRARY);
  return m.items
    .filter((e) => !e.removed_at && !transcribed.has(e.sb_id))
    .map((e) => {
      const year = yearOf(e);
      const desc = e.description && !e.title.includes(e.description.split('\n')[0]) ? e.description.replaceAll('\n', ' ') : '';
      return {
        path: `ordinance-titles/${e.sb_id}.md`,
        title: `${e.number_listed ? `No. ${e.number_listed}` : 'Ordinance'}${year ? ` (${year})` : ''}: ${e.title}`,
        kind: 'ordinance-titles',
        site_url: `/ordinances?category=${encodeURIComponent(e.category ?? '')}`,
        source_url: e.page_url,
        source_label: 'Carmona SB Office ordinance library',
        date: year ? String(year) : null,
        sourceLine: `Carmona SB Office ordinance library, item ${e.sb_id}, category ${e.category}`,
        details: [
          'Only the title is known. The ordinance has not been transcribed, and its full text is in the scan on the library page.',
          ...(PANDEMIC?.test(`${e.title} ${e.description}`) ? [PANDEMIC_LINE] : []),
        ],
        keywords: { en: ['ordinance', 'local law'], fil: ['ordinansa', 'kautusan'] },
        body: [
          `The Carmona SB Office library lists this ordinance as: ${e.title}.`,
          desc ? `The library's description: ${desc}` : '',
          `Category: ${e.category}. Library item ${e.sb_id}: ${e.page_url}`,
          e.state === 'missing-file' ? 'The library has no file for it.' : '',
          'It may have been amended or repealed since.',
        ].filter(Boolean).join('\n'),
      };
    });
}

// Hotlines, offices, officials, barangays

function numberLine(h: Hotline['numbers'][number]): string {
  const parts = [h.areaCode ? `(${h.areaCode}) ${h.display}` : h.display];
  if (h.sms) parts.push('also by SMS');
  if (h.note) parts.push(h.note);
  return `- ${parts.join(', ')}`;
}

const hotlineSource = (h: Hotline) => (h.source.startsWith('http') ? { url: h.source, label: "City of Carmona's hotline graphic" } : { url: undefined, label: h.source });

function hotlineDocs(): Doc[] {
  const groupName = { main: 'Main emergency numbers', city: 'City offices and emergency services', barangay: 'Barangay hotline' };
  const docs: Doc[] = HOTLINES.map((h) => {
    const src = hotlineSource(h);
    const barangay = BARANGAYS.find((b) => b.hotline === h.label);
    return {
      path: `hotlines/${hotlineId(h.label)}.md`,
      title: `${h.label} hotline`,
      kind: 'hotline',
      site_url: `/hotlines#${hotlineId(h.label)}`,
      source_url: src.url,
      source_label: src.label,
      date: h.recordedAt,
      sourceLine: `${src.label}, recorded ${h.recordedAt}`,
      keywords: { en: [], fil: [] },
      body: [
        `${groupName[h.group]}: ${h.label}${barangay ? `, Barangay ${barangay.number}${barangay.name ? ` (${barangay.name})` : ''}` : ''}`,
        h.hours ? `Hours: ${h.hours}` : '',
        'Numbers:',
        ...h.numbers.map(numberLine),
        '',
        'Numbers can change. For an emergency, call the Emergency Hotline first.',
      ].filter((l) => l !== '').join('\n'),
    };
  });
  docs.push({
    path: 'hotlines/_all.md',
    title: 'Emergency and hotline numbers in Carmona',
    kind: 'hotline-list',
    site_url: '/hotlines',
    source_label: 'BML Carmona App and the city hotline graphic',
    date: HOTLINES_RECORDED_AT,
    sourceLine: `BML Carmona App and the City of Carmona's hotline graphic, recorded ${HOTLINES_RECORDED_AT}`,
    keywords: { en: ['emergency number', 'hotline', 'who to call', 'police', 'fire', 'ambulance'], fil: ['numero ng emergency', 'saan tatawag', 'pulis', 'bumbero', 'ambulansya', 'tawag'] },
    body: HOTLINES.map((h) => `- ${h.label}: ${h.numbers.map((n) => (n.areaCode ? `(${n.areaCode}) ${n.display}` : n.display)).join(', ')}`).join('\n'),
  });
  return docs;
}

function officeDocs(): Doc[] {
  return OFFICES.map((o: Office) => {
    const services = SERVICES.filter((s) => s.office.toLowerCase() === o.name.toLowerCase());
    return {
      path: `offices/${slug(o.name)}.md`,
      title: o.name,
      kind: 'office',
      site_url: '/government',
      source_url: o.sourceUrl ?? OFFICES_URL,
      source_label: "City of Carmona's offices page",
      date: OFFICES_RECORDED_AT,
      sourceLine: `City of Carmona website, Departments / Offices / Units page, recorded ${OFFICES_RECORDED_AT}`,
      keywords: { en: [], fil: [] },
      body: [
        `${o.name} is an office of the City Government of Carmona.${o.publishedAs ? ` The city's page titles it "${o.publishedAs}".` : ''}`,
        o.sourceUrl ? `Its page on the city website: ${o.sourceUrl}` : 'The city website lists it without a page of its own.',
        ...(services.length ? ['', 'Services from this office described on BetterCarmona:', ...services.map((s) => `- ${s.title}: /services/${s.id}`)] : []),
      ].join('\n'),
    };
  });
}

function officialsDoc(): Doc {
  return {
    path: 'officials.md',
    title: 'Elected officials of the City of Carmona',
    kind: 'officials',
    site_url: '/government',
    source_url: OFFICIALS_URL,
    source_label: "City of Carmona's elected officials page",
    date: OFFICIALS_RECORDED_AT,
    sourceLine: `City of Carmona website, Elected Officials page, recorded ${OFFICIALS_RECORDED_AT}`,
    keywords: { en: ['mayor', 'vice mayor', 'councilor', 'city council', 'who is the mayor', 'congressman'], fil: ['alkalde', 'meyor', 'bise alkalde', 'konsehal', 'sino ang meyor', 'kongresista'] },
    body: OFFICIALS.map((o) => `- ${o.role}: ${o.name ?? 'not named on the city page'}`).join('\n'),
  };
}

function barangayDocs(): Doc[] {
  const list: Doc = {
    path: 'barangays/_all.md',
    title: `The ${BARANGAYS.length} barangays of the City of Carmona`,
    kind: 'barangay-list',
    site_url: '/barangays',
    source_url: BARANGAY_OFFICIALS_URL,
    source_label: "City of Carmona's barangay officials page",
    date: BARANGAYS_RECORDED_AT,
    sourceLine: `City of Carmona website, Barangay Officials page, recorded ${BARANGAYS_RECORDED_AT}`,
    keywords: { en: ['how many barangays', 'list of barangays', 'barangay captains'], fil: ['ilan ang barangay', 'mga barangay', 'listahan ng barangay', 'mga kapitan'] },
    body: [
      `The City of Carmona has ${BARANGAYS.length} barangays. Each is listed with its punong barangay (barangay captain):`,
      ...BARANGAYS.map((b) => `- Barangay ${b.number}${b.name ? ` (${b.name})` : ''}: ${b.captain}`),
    ].join('\n'),
  };
  return [list, ...BARANGAYS.map((b: Barangay) => {
    const hotline = HOTLINES.find((h) => h.label === b.hotline);
    const title = `Barangay ${b.number}${b.name ? ` (${b.name})` : ''}`;
    return {
      path: `barangays/${b.number}.md`,
      title,
      kind: 'barangay',
      site_url: '/barangays',
      source_url: BARANGAY_OFFICIALS_URL,
      source_label: "City of Carmona's barangay officials page",
      date: BARANGAYS_RECORDED_AT,
      sourceLine: `City of Carmona website, Barangay Officials page, recorded ${b.recordedAt}`,
      keywords: { en: [], fil: [] },
      body: [
        `${title} is one of the 14 barangays of the City of Carmona.`,
        `Punong barangay (barangay captain): ${b.captain}`,
        b.officialPage.available ? `Its page: ${b.officialPage.url}` : 'Its page on the city website was not found when last checked.',
        hotline ? `Hotline: ${hotline.numbers.map((n) => (n.areaCode ? `(${n.areaCode}) ${n.display}` : n.display)).join(', ')}` : '',
      ].filter(Boolean).join('\n'),
    };
  })];
}

function aboutDoc(): Doc {
  const a = en.about;
  const f = fil.about;
  return {
    path: 'site/about.md',
    title: a.heading,
    kind: 'about',
    site_url: '/about',
    source_label: 'BetterCarmona',
    date: null,
    sourceLine: 'BetterCarmona, About page',
    keywords: { en: ['who runs this site', 'is this official', 'report an error', 'contact'], fil: ['sino ang may-ari ng site', 'opisyal ba ito', 'mag-report ng mali'] },
    body: [
      `## ${a.who.heading}`, a.who.body, `${a.who.official} ${OFFICIAL_PORTAL_URL}`, '',
      `## ${a.sources.heading}`, a.sources.body, a.sources.check, a.sources.budget, '',
      `## ${a.errors.heading}`, a.errors.body, a.errors.note, '',
      `## ${f.who.heading}`, f.who.body, `${f.who.official} ${OFFICIAL_PORTAL_URL}`, '',
      `## ${f.sources.heading}`, f.sources.body, f.sources.check,
    ].join('\n'),
  };
}

// Glossary

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termPattern = (t: string) => new RegExp(`(^|[^\\p{L}])${escape(t)}($|[^\\p{L}])`, 'iu');

/** The glossary terms a document's text uses, with their other side, for the "Also asked as" line. */
export function glossaryMatches(text: string, glossary: GlossaryEntry[]): string[] {
  const found: string[] = [];
  for (const g of glossary) {
    if ([...g.everyday, ...g.official].some((t) => termPattern(t).test(text))) found.push(...g.everyday, ...g.official);
  }
  return unique(found);
}

/** Every term, mapped to the terms on the other side of its entry, for expanding a question. */
export function compactGlossary(glossary: GlossaryEntry[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of glossary) {
    for (const t of g.everyday) out[t.toLowerCase()] = unique([...(out[t.toLowerCase()] ?? []), ...g.official]);
    for (const t of g.official) out[t.toLowerCase()] = unique([...(out[t.toLowerCase()] ?? []), ...g.everyday]);
  }
  return out;
}

function render(d: Doc, glossary: GlossaryEntry[]): string {
  const extra = glossaryMatches(`${d.title}\n${d.body}`, glossary)
    .filter((t) => ![...d.keywords.en, ...d.keywords.fil].some((k) => k.toLowerCase() === t.toLowerCase()))
    .slice(0, GLOSSARY_LIMIT);
  const asked = [unique(d.keywords.en).join(', '), unique([...d.keywords.fil, ...extra]).join(', ')].filter(Boolean).join('; ');
  return [
    `# ${d.title}`,
    `Kind: ${KIND_LABEL[d.kind] ?? d.kind}. Source: ${d.sourceLine}.`,
    ...(d.details ?? []),
    `Also asked as: ${asked}`,
    '',
    d.body.trim(),
    '',
  ].join('\n');
}

const INDEX_FIELDS = [
  'title', 'kind', 'site_url', 'source_url', 'source_label', 'date',
  'sb_id', 'number_printed', 'year', 'status', 'coverage', 'reviewed', 'language',
] as const;

function indexEntry(d: Doc): IndexEntry {
  return Object.fromEntries(INDEX_FIELDS.filter((k) => d[k] !== undefined).map((k) => [k, d[k]])) as unknown as IndexEntry;
}

export function buildDocs(): Doc[] {
  const keywords = readJson<Record<string, { en: string[]; fil: string[] }>>(SERVICE_KEYWORDS, {});
  const ordinances = ordinanceDocs();
  const transcribed = new Set(ordinances.map((d) => d.sb_id!));
  return [
    ...serviceDocs(keywords),
    ...charterIndexDocs(),
    ...ordinances,
    ...ordinanceTitleDocs(transcribed),
    ...hotlineDocs(),
    ...officeDocs(),
    officialsDoc(),
    ...barangayDocs(),
    aboutDoc(),
  ];
}

/**
 * The documents cut at their `##` sections, for the chat API's fixture search (CHAT_FIXTURES=1), which
 * stands in for AI Search in tests and local work. Each passage keeps its document's header.
 */
function fixturePassages(docs: Doc[], glossary: GlossaryEntry[]): { key: string; title: string; text: string }[] {
  return docs.flatMap((d) => {
    const [head, ...rest] = render(d, glossary).split(/\n(?=## )/);
    const intro = head.split('\n\n')[0];
    return [head, ...rest.map((section) => `${intro}\n\n${section}`)].map((text) => ({ key: d.path, title: d.title, text }));
  });
}

export function build(): KbIndex {
  const glossary = readJson<{ entries: GlossaryEntry[] }>(GLOSSARY, { entries: [] }).entries;
  const docs = buildDocs();
  // Clears .kb/ but keeps the test set's saved searches, which kb:eval checks against the index version.
  for (const entry of existsSync(KB) ? readdirSync(KB) : []) {
    if (entry !== 'eval-cache') rmSync(join(KB, entry), { recursive: true, force: true });
  }
  const hash = createHash('sha256');
  const documents: Record<string, IndexEntry> = {};
  for (const d of docs) {
    const text = render(d, glossary);
    const file = join(KB, d.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    hash.update(d.path).update('\0').update(text);
    documents[d.path] = indexEntry(d);
  }
  writeFileSync(join(KB, 'glossary.json'), `${JSON.stringify(compactGlossary(glossary))}\n`);
  writeFileSync(join(KB, 'fixture-passages.json'), `${JSON.stringify(fixturePassages(docs, glossary))}\n`);
  const index: KbIndex = { version: hash.digest('hex').slice(0, 16), documents };
  writeFileSync(INDEX, `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  const index = build();
  const counts: Record<string, number> = {};
  for (const d of Object.values(index.documents)) counts[d.kind] = (counts[d.kind] ?? 0) + 1;
  console.log(`Wrote ${Object.keys(index.documents).length} documents to .kb/ (version ${index.version})`);
  for (const [kind, n] of Object.entries(counts)) console.log(`  ${kind}: ${n}`);
}
