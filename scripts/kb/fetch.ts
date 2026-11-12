/**
 * Lists every item in the Carmona SB Office library, downloads each file once to knowledge/raw/,
 * and records it in knowledge/sources/sb-office.json.
 *
 *   npm run kb:fetch                    new items only; files already downloaded are kept
 *   npm run kb:fetch -- --refresh       re-read every page and file, and mark changed files
 *   npm run kb:fetch -- --sweep         also try every id from 1 up, to check the category pages
 *   npm run kb:fetch -- --ids 23,514    only these items, without reading the category pages
 *
 * One request at a time, at least GAP_MS apart, with a User-Agent that says who is asking.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argv, exit } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadManifest, RAW, rawPath, saveManifest, today, type Entry, type FileRecord, type Manifest } from './manifest.ts';
import {
  categoryUrl, fileNameOf, LIBRARY, pageUrl, parseCategories, parseCategoryPage, parseItemPage, pdfPages,
} from './sb-office.ts';

const USER_AGENT = 'BetterCarmona/1.0 (+https://bettercarmona.org/about)';
const GAP_MS = 1500;
const RETRY_DELAYS_MS = [10_000, 30_000, 90_000];
const MAX_FAILURES_IN_A_ROW = 5;
const SWEEP_MISSES = 60;
const PAGES = join(RAW, 'pages');

class Stop extends Error {}

const args = argv.slice(2);
const refresh = args.includes('--refresh');
const sweep = args.includes('--sweep');
const idsArg = args.includes('--ids') ? args[args.indexOf('--ids') + 1] : undefined;

let lastSent = 0;
let failuresInARow = 0;
let requests = 0;

/** GET with the gap, the retries, and the stop rules. Returns null for a 404. */
async function get(url: string): Promise<Buffer | null> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastSent + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastSent = Date.now();
    requests++;
    let problem: string;
    try {
      const res = await fetch(new URL(url), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(300_000),
      });
      if (res.status === 429) {
        throw new Stop(`HTTP 429 from ${url}, Retry-After ${res.headers.get('retry-after') ?? 'not given'}. Stopping.`);
      }
      if (res.ok || res.status === 404) {
        const body = Buffer.from(await res.arrayBuffer());
        failuresInARow = 0;
        return res.ok ? body : null;
      }
      problem = `HTTP ${res.status}`;
    } catch (err) {
      if (err instanceof Stop) throw err;
      const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : '';
      problem = err instanceof Error ? `${err.message}${cause}` : String(err);
    }
    failuresInARow++;
    console.warn(`  ${problem} on ${url} (failure ${failuresInARow} in a row)`);
    if (failuresInARow >= MAX_FAILURES_IN_A_ROW) {
      throw new Stop(`${MAX_FAILURES_IN_A_ROW} failures in a row. The server may be down. Stopping.`);
    }
    if (attempt >= RETRY_DELAYS_MS.length) throw new Error(`gave up on ${url}: ${problem}`);
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** Reads the front page and every category page. Returns each listed id with the categories that list it. */
async function discover(m: Manifest): Promise<{ listed: Map<number, string[]>; complete: boolean }> {
  const front = await get(LIBRARY);
  if (!front) throw new Stop('the library front page returned 404');
  const categories = parseCategories(front.toString('utf8'));
  if (!categories.length) throw new Stop('no categories found on the front page; the page shape may have changed');
  m.categories = categories;
  const listed = new Map<number, string[]>();
  let complete = true;
  for (const c of categories) {
    const html = await get(categoryUrl(c.id));
    if (!html) {
      console.warn(`  category ${c.id} (${c.name}) returned 404`);
      complete = false;
      continue;
    }
    const { ids, paged } = parseCategoryPage(html.toString('utf8'));
    for (const id of ids) listed.set(id, [...(listed.get(id) ?? []), c.name]);
    const note = c.count !== undefined && c.count !== ids.length ? `, but the front page says ${c.count}` : '';
    console.log(`  ${c.name}: ${ids.length}${note}`);
    if (note || paged) complete = false;
    if (paged) console.warn(`  ${c.name} shows signs of paging; run with --sweep to be sure nothing is missed`);
  }
  return { listed, complete };
}

/**
 * Tries every id from 1 up to the highest known one, then on until SWEEP_MISSES 404s in a row. The
 * library has gaps of over 100 ids, so the miss count only ends the sweep past the known ids.
 * Returns the pages it found, by id.
 */
async function sweepIds(highestKnown: number): Promise<Map<number, string>> {
  const found = new Map<number, string>();
  for (let id = 1, misses = 0; id <= highestKnown || misses < SWEEP_MISSES; id++) {
    const html = await get(pageUrl(id));
    if (html) {
      found.set(id, html.toString('utf8'));
      misses = 0;
    } else {
      misses++;
    }
    if (id % 50 === 0) console.log(`  swept to ${id}, ${found.size} found`);
  }
  return found;
}

function blank(id: number): Entry {
  return {
    sb_id: id, title: '', number_listed: null, description: '', category: null, page_url: pageUrl(id),
    file_url: null, file_name: null, sha256: null, bytes: null, pages: null,
    first_seen: today(), fetched_at: null, state: 'listed',
  };
}

/** Downloads one file unless the copy on disk already matches. Returns the new record and whether it changed. */
async function download(id: number, rec: FileRecord, index: number): Promise<{ rec: FileRecord; changed: boolean } | null> {
  const path = rawPath(id, rec.file_name, index);
  if (!refresh && rec.sha256 && existsSync(path) && sha256(readFileSync(path)) === rec.sha256) {
    return { rec, changed: false };
  }
  const body = await get(rec.file_url);
  if (!body) return null;
  if (/\.pdf$/i.test(rec.file_name) && !body.subarray(0, 1024).toString('latin1').includes('%PDF')) {
    throw new Error(`${rec.file_url} did not return a PDF`);
  }
  writeFileSync(path, body);
  const hash = sha256(body);
  return {
    rec: { ...rec, sha256: hash, bytes: body.length, pages: pdfPages(body) },
    changed: rec.sha256 !== null && rec.sha256 !== hash,
  };
}

async function fetchItem(m: Manifest, id: number, cached?: string): Promise<void> {
  let entry = m.items.find((e) => e.sb_id === id);
  if (!entry || refresh) {
    const html = cached ?? (await get(pageUrl(id)))?.toString('utf8');
    if (!html) {
      if (entry && !entry.removed_at) entry.removed_at = today();
      console.warn(`  ${id}: page not found`);
      return;
    }
    writeFileSync(join(PAGES, `view-${id}.html`), html);
    const page = parseItemPage(html);
    if (!entry) {
      entry = blank(id);
      m.items.push(entry);
    }
    const [first, ...rest] = page.fileUrls;
    const keep = (url: string, old?: FileRecord | null): FileRecord =>
      old?.file_url === url ? old : { file_url: url, file_name: fileNameOf(url), sha256: null, bytes: null, pages: null };
    const old = entry.file_url
      ? { file_url: entry.file_url, file_name: entry.file_name ?? '', sha256: entry.sha256, bytes: entry.bytes, pages: entry.pages }
      : null;
    const main = first ? keep(first, old) : null;
    Object.assign(entry, {
      title: page.title,
      number_listed: page.numberListed,
      description: page.description,
      category: page.category,
      file_url: main?.file_url ?? null,
      file_name: main?.file_name ?? null,
      sha256: main?.sha256 ?? null,
      bytes: main?.bytes ?? null,
      pages: main?.pages ?? null,
    });
    if (rest.length) entry.extra_files = rest.map((url, i) => keep(url, entry!.extra_files?.[i]));
    else delete entry.extra_files;
    saveManifest(m);
  }

  if (!entry.file_url || !entry.file_name) {
    if (entry.state !== 'missing-file') console.log(`  ${id}: no file on the page`);
    entry.state = 'missing-file';
    saveManifest(m);
    return;
  }
  // A file already found missing is only asked for again with --refresh.
  const knownMissing = entry.state === 'missing-file' && !refresh;
  const files: FileRecord[] = [
    { file_url: entry.file_url, file_name: entry.file_name, sha256: entry.sha256, bytes: entry.bytes, pages: entry.pages },
    ...(entry.extra_files ?? []),
  ];
  let changed = false;
  let missing = false;
  let fetched = false;
  for (const [i, rec] of files.entries()) {
    const result = knownMissing && !rec.sha256 ? null : await download(id, rec, i);
    if (!result) {
      missing = true;
      continue;
    }
    if (result.rec !== rec) fetched = true;
    changed ||= result.changed;
    files[i] = result.rec;
  }
  const [main, ...rest] = files;
  Object.assign(entry, { sha256: main.sha256, bytes: main.bytes, pages: main.pages });
  if (rest.length) entry.extra_files = rest;
  if (fetched) entry.fetched_at = new Date().toISOString();
  if (missing) entry.state = 'missing-file';
  else if (changed) entry.state = 'changed';
  else if (entry.state === 'listed' || entry.state === 'missing-file') entry.state = 'downloaded';
  if (fetched || (missing && !knownMissing)) {
    const size = main.bytes ? `${Math.round(main.bytes / 1024)} KB, pages: ${main.pages ?? '?'}` : 'no file';
    console.log(`  ${id}: ${entry.state} (${size}) ${entry.title.slice(0, 70)}`);
  }
  saveManifest(m);
}

async function main() {
  mkdirSync(PAGES, { recursive: true });
  const m = loadManifest(LIBRARY);
  let ids: number[];
  let cached = new Map<number, string>();

  if (idsArg) {
    ids = idsArg.split(',').map(Number).filter(Number.isInteger);
  } else {
    console.log('Reading the category pages');
    const { listed, complete } = await discover(m);
    saveManifest(m);
    const doubles = [...listed].filter(([, cats]) => cats.length > 1);
    if (doubles.length) console.log(`  ${doubles.length} items are listed in more than one category`);
    console.log(`  ${listed.size} items listed`);
    const all = new Set(listed.keys());
    let sweptAll = false;
    if (sweep) {
      const highest = Math.max(0, ...listed.keys(), ...m.items.map((e) => e.sb_id));
      console.log(`Sweeping ids from 1 to ${highest}, then until ${SWEEP_MISSES} misses in a row`);
      cached = await sweepIds(highest);
      const extra = [...cached.keys()].filter((id) => !listed.has(id));
      const gone = [...listed.keys()].filter((id) => !cached.has(id));
      console.log(`  sweep found ${cached.size}; not in any category: ${extra.join(', ') || 'none'}; listed but not found: ${gone.join(', ') || 'none'}`);
      for (const id of extra) all.add(id);
      sweptAll = true;
    }
    if (complete || sweptAll) {
      for (const e of m.items) {
        if (all.has(e.sb_id)) delete e.removed_at;
        else if (!e.removed_at) {
          e.removed_at = today();
          console.log(`  ${e.sb_id} is no longer in the library; kept with removed_at`);
        }
      }
    }
    ids = [...all].sort((a, b) => a - b);
  }

  const before = requests;
  console.log(`Fetching ${ids.length} items`);
  let failed = 0;
  for (const id of ids) {
    try {
      await fetchItem(m, id, cached.get(id));
    } catch (err) {
      if (err instanceof Stop) throw err;
      failed++;
      console.warn(`  ${id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  saveManifest(m);
  console.log(`Done: ${requests} requests (${requests - before} for items), ${failed} items failed. Run npm run kb:status for the counts.`);
  if (failed) exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  exit(1);
});
