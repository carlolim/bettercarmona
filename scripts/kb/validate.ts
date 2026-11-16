/**
 * Fails the build when a file under knowledge/ordinances/ breaks the rules in knowledge/TRANSCRIPTION.md:
 * a missing or mistyped field, a hash that differs from the manifest, a long dash, a wrong count of
 * uncertain marks. Also run on its own, on every file or on the files named:
 *
 *   npm run kb:validate
 *   npm run kb:validate -- knowledge/ordinances/2002/514-pagsusunog-ng-basura.md
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { parse } from 'yaml';
import { loadManifest, ROOT, type Entry } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';

export const ORDINANCES = join(ROOT, 'knowledge/ordinances');

const KINDS = ['ordinance', 'appropriation-ordinance', 'resolution', 'other'];
const STATUSES = ['unverified', 'in-force', 'amended', 'repealed'];
const COVERAGES = ['full', 'summary'];
const LANGUAGES = ['en', 'fil', 'mixed'];
const LIBRARY_HOST = '122.54.120.194:888';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LONG_DASH = /[\u2013\u2014]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const PAGE_MARKER = /<!-- page \d+ -->/g;
/** The marks rules 5, 11, and 12 of the guide ask for. Each one counts as uncertain. */
const UNCERTAIN = /\[(illegible|unclear:|table not transcribed:|annex not transcribed:|annex not in this file:)/g;
const SUMMARY_LINE = '[summary only: the full text is not transcribed. See the scan.]';
const PESO = /(?:PHP|Php|PhP|P|\u20b1)\s?\d[\d,]*(?:\.\d+)?/g;

export interface Result {
  problems: string[];
  warnings: string[];
}

type Doc = Record<string, unknown>;

const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isStringOrNull = (v: unknown) => v === null || isString(v);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
const isDateOrNull = (v: unknown) => v === null || (typeof v === 'string' && DATE.test(v));
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const squash = (s: string) => s.replace(/\s+/g, '');

/** Splits a file into its frontmatter, parsed, and its body. */
export function splitFile(text: string): { front: Doc; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error('no frontmatter between --- lines');
  const front = parse(m[1]) as unknown;
  if (!front || typeof front !== 'object' || Array.isArray(front)) throw new Error('the frontmatter is not a map');
  return { front: front as Doc, body: m[2] };
}

/** Checks one file. `path` is used for the file name rule and in the messages. */
export function fileProblems(path: string, text: string, manifest: Map<number, Entry>): Result {
  const problems: string[] = [];
  const warnings: string[] = [];
  const at = path;
  let front: Doc;
  let body: string;
  try {
    ({ front, body } = splitFile(text));
  } catch (err) {
    return { problems: [`${at}: ${err instanceof Error ? err.message : err}`], warnings };
  }
  const need = (ok: boolean, message: string) => {
    if (!ok) problems.push(`${at}: ${message}`);
  };

  const id = front.sb_id;
  const entry = Number.isInteger(id) ? manifest.get(id as number) : undefined;
  need(Number.isInteger(id), 'sb_id must be a whole number');
  need(!Number.isInteger(id) || entry !== undefined, `sb_id ${id} is not in knowledge/sources/sb-office.json`);
  need(KINDS.includes(front.kind as string), `kind must be one of ${KINDS.join(', ')}`);
  need(COVERAGES.includes(front.coverage as string), `coverage must be one of ${COVERAGES.join(', ')}`);
  need('number_printed' in front && isStringOrNull(front.number_printed), 'number_printed must be text or null');
  need('number_listed' in front && isStringOrNull(front.number_listed), 'number_listed must be text or null');
  if (entry) need(front.number_listed === entry.number_listed, `number_listed must be ${JSON.stringify(entry.number_listed)}, as in the manifest`);
  need(Number.isInteger(front.year), 'year must be a whole number');
  need(isString(front.title), 'title is missing');
  if ('title_en' in front) need(isString(front.title_en), 'title_en must be text when present');
  if ('corrections' in front) need(isStringList(front.corrections), 'corrections must be a list of text');
  need(LANGUAGES.includes(front.language as string), `language must be one of ${LANGUAGES.join(', ')}`);
  need('issuing_body' in front && isStringOrNull(front.issuing_body), 'issuing_body must be text or null');
  need('session' in front && isStringOrNull(front.session), 'session must be text or null');
  for (const field of ['date_enacted', 'date_approved']) {
    need(field in front && isDateOrNull(front[field]), `${field} must be YYYY-MM-DD or null`);
  }
  if (typeof front.date_enacted === 'string' && typeof front.date_approved === 'string') {
    need(front.date_approved >= front.date_enacted, 'date_approved is before date_enacted');
  }
  for (const field of ['introduced_by', 'committees']) {
    if (field in front) need(isStringList(front[field]), `${field} must be a list of text when present`);
  }
  need(isString(front.category), 'category is missing');
  if (entry) need(front.category === entry.category, `category must be ${JSON.stringify(entry.category)}, as in the manifest`);
  need(STATUSES.includes(front.status as string), `status must be one of ${STATUSES.join(', ')}`);

  for (const lang of ['en', 'fil']) {
    const summary = front[`summary_${lang}`];
    need(isString(summary), `summary_${lang} is missing`);
    if (isString(summary) && words(summary) > 90) warnings.push(`${at}: summary_${lang} has ${words(summary)} words, over 90`);
    const keywords = front[`keywords_${lang}`];
    need(isStringList(keywords), `keywords_${lang} must be a list of text`);
    if (isStringList(keywords) && keywords.length < 6) warnings.push(`${at}: keywords_${lang} has ${keywords.length} entries, fewer than 6`);
  }

  const source = (front.source ?? {}) as Doc;
  need(typeof front.source === 'object' && front.source !== null, 'source is missing');
  for (const field of ['page_url', 'file_url']) {
    const url = source[field];
    const ok = isString(url) && (url.startsWith('https://') || url.startsWith(`http://${LIBRARY_HOST}/`));
    need(ok, `source.${field} must be an https URL, or http only on ${LIBRARY_HOST}`);
  }
  need(source.pages === null || Number.isInteger(source.pages), 'source.pages must be a whole number or null');
  need(typeof source.fetched_at === 'string' && DATE.test(source.fetched_at), 'source.fetched_at must be YYYY-MM-DD');
  need(typeof source.sha256 === 'string' && /^[0-9a-f]{64}$/.test(source.sha256), 'source.sha256 must be a SHA-256 hash');
  if (entry) {
    need(source.sha256 === entry.sha256, 'source.sha256 differs from the manifest: the file has changed since this was written');
    need(source.page_url === entry.page_url, 'source.page_url differs from the manifest');
  }

  const t = (front.transcription ?? {}) as Doc;
  need(typeof front.transcription === 'object' && front.transcription !== null, 'transcription is missing');
  need(isString(t.by), 'transcription.by is missing');
  need(typeof t.date === 'string' && DATE.test(t.date), 'transcription.date must be YYYY-MM-DD');
  need(typeof t.reviewed === 'boolean', 'transcription.reviewed must be true or false');
  need(Number.isInteger(t.uncertain) && (t.uncertain as number) >= 0, 'transcription.uncertain must be a whole number');

  need(/^# \S/m.test(body), 'the body has no "# " heading');
  const lines = text.split('\n');
  const dash = lines.findIndex((l) => LONG_DASH.test(l));
  need(dash < 0, `long dash on line ${dash + 1}: write a hyphen`);
  const emoji = lines.findIndex((l) => EMOJI.test(l));
  need(emoji < 0, `emoji on line ${emoji + 1}`);

  let marks = body.match(UNCERTAIN)?.length ?? 0;
  if (front.coverage === 'full') {
    need(/^## \S/m.test(body), 'a full transcription needs "## " sections');
    const markers = body.match(PAGE_MARKER)?.length ?? 0;
    const annexOut = body.includes('[annex not transcribed:');
    if (Number.isInteger(source.pages) && !annexOut) {
      need(markers === source.pages, `${markers} page markers, but source.pages is ${source.pages}`);
    }
    need(!('key_facts' in front), 'key_facts belongs only in a summary-only file');
  }
  if (front.coverage === 'summary') {
    const facts = front.key_facts;
    need(Array.isArray(facts) && facts.length > 0, 'key_facts is empty');
    const values: string[] = [];
    if (Array.isArray(facts)) {
      facts.forEach((f: Doc, i) => {
        const ok = f && isString(f.label) && isString(f.value) && Number.isInteger(f.page) && (f.page as number) >= 1;
        need(Boolean(ok), `key fact ${i + 1} needs a label, a value, and a page`);
        if (f && typeof f.value === 'string') {
          values.push(squash(f.value));
          marks += f.value.match(UNCERTAIN)?.length ?? 0;
        }
      });
    }
    const rest = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('# ') && l !== SUMMARY_LINE);
    need(rest.length === 0, `a summary-only body holds only its heading and the "summary only" line, not "${rest[0]?.slice(0, 60)}"`);
    need(body.includes(SUMMARY_LINE), 'the "summary only" line is missing');
    for (const lang of ['en', 'fil']) {
      const summary = front[`summary_${lang}`];
      if (typeof summary !== 'string') continue;
      for (const amount of summary.match(PESO) ?? []) {
        need(values.some((v) => v.includes(squash(amount))), `summary_${lang} gives ${amount}, which is not in key_facts`);
      }
    }
  }
  need(t.uncertain === marks, `transcription.uncertain is ${t.uncertain}, but the file has ${marks} uncertain marks`);
  if (Number.isInteger(t.uncertain) && (t.uncertain as number) > 5) warnings.push(`${at}: ${t.uncertain} uncertain marks, over 5`);

  const year = basename(dirname(path));
  const name = basename(path);
  const slug = new RegExp(`^${id}-[a-z0-9]+(-[a-z0-9]+){1,4}\\.md$`);
  need(year === String(front.year) && slug.test(name), `the file name must be {year}/{sb_id}-{two to five words}.md, here ${front.year}/${id}-...md`);

  return { problems, warnings };
}

/** Every markdown file under knowledge/ordinances/. */
export function ordinanceFiles(): string[] {
  if (!existsSync(ORDINANCES)) return [];
  return readdirSync(ORDINANCES, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(ORDINANCES, f))
    .sort();
}

/** Checks the files named, or every ordinance file. */
export function validate(paths = ordinanceFiles()): Result {
  const manifest = new Map(loadManifest(LIBRARY).items.map((e) => [e.sb_id, e]));
  const result: Result = { problems: [], warnings: [] };
  const ids = new Map<number, string>();
  for (const path of paths) {
    const rel = relative(ROOT, path);
    const r = fileProblems(rel, readFileSync(path, 'utf8'), manifest);
    result.problems.push(...r.problems);
    result.warnings.push(...r.warnings);
    const id = Number(/^(\d+)-/.exec(basename(path))?.[1]);
    if (ids.has(id) && path.startsWith(ORDINANCES)) result.problems.push(`${rel}: sb_id ${id} also has ${ids.get(id)}`);
    ids.set(id, rel);
  }
  return result;
}

// The built search documents in .kb/, from kb:build

const KB = join(ROOT, '.kb');
const KB_INDEX = join(KB, 'kb-index.json');
const MAX_DOCUMENT = 60_000;
/** Ordinance pages come in task 029. Until then their links are allowed without a route. */
const PENDING_ROUTES = ['/ordinances'];

/** The community routes in src/App.tsx, as patterns. */
export function siteRoutes(app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8')): RegExp[] {
  const paths = [...app.matchAll(/path="([^"*]+)"/g)].map((m) => m[1].replace(/^\//, ''));
  return ['', ...paths].map((p) => new RegExp(`^/${p.replace(/:[^/]+/g, '[^/]+')}$`));
}

interface IndexEntry {
  title?: string;
  kind?: string;
  site_url?: string;
  source_url?: string;
}

/** Checks .kb/kb-index.json against the files in .kb/ and the site's routes. */
export function indexProblems(): string[] {
  if (!existsSync(KB_INDEX)) return ['.kb/kb-index.json is missing: run npm run kb:build'];
  const problems: string[] = [];
  const index = JSON.parse(readFileSync(KB_INDEX, 'utf8')) as { version?: string; documents?: Record<string, IndexEntry> };
  const documents = index.documents ?? {};
  if (!index.version) problems.push('kb-index.json has no version');
  const routes = siteRoutes();
  for (const [path, e] of Object.entries(documents)) {
    const at = `.kb/${path}`;
    if (!e.title?.trim()) problems.push(`${at}: the index gives no title`);
    if (!e.kind?.trim()) problems.push(`${at}: the index gives no kind`);
    if (!e.site_url && !e.source_url) problems.push(`${at}: the index gives neither a site_url nor a source_url`);
    if (e.site_url) {
      const route = e.site_url.split(/[?#]/)[0];
      const pending = PENDING_ROUTES.some((p) => route === p || route.startsWith(`${p}/`));
      if (!route.startsWith('/') || (!pending && !routes.some((r) => r.test(route)))) problems.push(`${at}: site_url ${e.site_url} matches no route in src/App.tsx`);
    }
    if (e.source_url && !/^https?:\/\//.test(e.source_url)) problems.push(`${at}: source_url must be an absolute link`);
    const file = join(KB, path);
    if (!existsSync(file)) {
      problems.push(`${at}: in the index, but the file is missing`);
      continue;
    }
    const size = readFileSync(file, 'utf8').trim().length;
    if (!size) problems.push(`${at}: the document is empty`);
    if (size > MAX_DOCUMENT) problems.push(`${at}: ${size} characters, over ${MAX_DOCUMENT}`);
  }
  const files = readdirSync(KB, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.md') && !f.startsWith('eval-cache'));
  for (const f of files) if (!(f in documents)) problems.push(`.kb/${f}: not in kb-index.json`);
  return problems;
}

/** Every service in SERVICES has six or more keywords in each language. */
export async function keywordProblems(): Promise<string[]> {
  const { SERVICES } = await import('../../src/community/data/services.ts');
  const path = join(ROOT, 'knowledge/keywords/services.json');
  const keywords = (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}) as Record<string, { en?: string[]; fil?: string[] }>;
  const problems: string[] = [];
  for (const s of SERVICES) {
    const k = keywords[s.id];
    if (!k || (k.en?.length ?? 0) < 6 || (k.fil?.length ?? 0) < 6) problems.push(`knowledge/keywords/services.json: service "${s.id}" needs six or more keywords in each language`);
  }
  for (const id of Object.keys(keywords)) {
    if (!SERVICES.some((s) => s.id === id)) problems.push(`knowledge/keywords/services.json: "${id}" is not a service in services.ts`);
  }
  return problems;
}

export function kbValidate(): Plugin {
  return {
    name: 'kb-validate',
    // npm run build runs kb:build first, so .kb/ exists. The dev server does not need it.
    apply: 'build',
    async buildStart() {
      const { problems, warnings } = validate();
      problems.push(...indexProblems(), ...(await keywordProblems()));
      for (const w of warnings) this.warn(w);
      if (problems.length) this.error(`Ordinance files:\n  ${problems.join('\n  ')}`);
    },
  };
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  const named = argv.slice(2).map((p) => resolve(process.env.INIT_CWD ?? process.cwd(), p));
  const { problems, warnings } = validate(named.length ? named : undefined);
  if (!named.length) problems.push(...indexProblems(), ...(await keywordProblems()));
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const p of problems) console.log(`problem: ${p}`);
  if (problems.length) exit(1);
  console.log(`Ordinance files OK (${named.length || ordinanceFiles().length} checked)${named.length ? '' : ', search index OK, keywords OK'}`);
}
