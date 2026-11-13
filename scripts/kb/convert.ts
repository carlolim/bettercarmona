/**
 * Turns downloaded SB Office documents into markdown files under knowledge/ordinances/, following
 * knowledge/TRANSCRIPTION.md. Each document is read by Claude Code in print mode, which may use only
 * the Read tool and the Write tool, and may write only under knowledge/ordinances/. Each file is then
 * checked by kb:validate, and the manifest is updated.
 *
 *   npm run kb:convert                          the next 10 items in priority order
 *   npm run kb:convert -- --limit 3
 *   npm run kb:convert -- --id 514              one item
 *   npm run kb:convert -- --category "WAYS & MEANS"
 *   npm run kb:convert -- --summaries           only items in summary-only categories
 *   npm run kb:convert -- --id 23 --full        a full transcription of a summary-only item
 *   npm run kb:convert -- --id 514 --redo       replace a file that is not yet reviewed
 *   npm run kb:convert -- --id 514 --force      replace even a reviewed file, or read a PDF over 60 pages
 *   npm run kb:convert -- --id 514 --redo --out /tmp/kb   write elsewhere, leaving the manifest alone
 *   npm run kb:convert -- --dry                 list what would be done
 *
 * Works in small batches and picks up where it stopped: an item leaves the queue once its state is
 * `transcribed`, `summarized`, or `needs-attention`.
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { promisify } from 'node:util';
import { loadManifest, rawPath, ROOT, saveManifest, today, type Entry, type Manifest } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';
import { fileProblems, ORDINANCES, splitFile } from './validate.ts';

const run = promisify(execFile);
const WORK = join(ROOT, '.kb/convert');
const PRIORITIES = join(ROOT, 'knowledge/sources/priorities.json');
const RANGE = 20;
const MAX_PAGES = 60;
const TIMEOUT_MS = 30 * 60_000;

const args = argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => (flag(name) ? args[args.indexOf(name) + 1] : undefined);
const limit = Number(option('--limit') ?? 10);
const onlyId = option('--id') !== undefined ? Number(option('--id')) : undefined;
const category = option('--category');
const out = option('--out') ? resolve(process.env.INIT_CWD ?? process.cwd(), option('--out')!) : undefined;
const model = option('--model');
const { redo, force, dry } = { redo: flag('--redo'), force: flag('--force'), dry: flag('--dry') };

const priorities = JSON.parse(readFileSync(PRIORITIES, 'utf8')) as {
  full_text: string[];
  summary_only: string[];
  defer?: { pattern: string };
};
const isSummaryOnly = (e: Entry) => priorities.summary_only.includes(e.category ?? '');
const deferred = priorities.defer ? new RegExp(priorities.defer.pattern, 'i') : undefined;

/** The year in an item's listed number or title, for newest-first order. */
export function yearOf(e: Entry): number {
  const text = `${e.number_listed ?? ''} ${e.title}`;
  const four = /\b(19[5-9]\d|20[0-4]\d)\b/.exec(text);
  if (four) return Number(four[1]);
  const two = /-(\d{2})\b/.exec(e.number_listed ?? '');
  if (two) return Number(two[1]) + (Number(two[1]) > 50 ? 1900 : 2000);
  return 0;
}

/** The category's place in priorities.json. Items matching `defer` come after every category. */
function rank(e: Entry): number {
  const order = [...priorities.full_text, ...priorities.summary_only];
  if (deferred?.test(`${e.title} ${e.description}`)) return order.length + 1;
  const i = order.indexOf(e.category ?? '');
  return i < 0 ? order.length : i;
}

/** The existing markdown file for an item, if any. */
function existing(id: number, dir = ORDINANCES): string | undefined {
  if (!existsSync(dir)) return undefined;
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => new RegExp(`(^|/)${id}-[^/]*\\.md$`).test(f))
    .map((f) => join(dir, f))[0];
}

function isReviewed(path: string): boolean {
  try {
    const t = splitFile(readFileSync(path, 'utf8')).front.transcription as { reviewed?: unknown } | undefined;
    return t?.reviewed === true;
  } catch {
    return false;
  }
}

function queue(m: Manifest, one: number | null | undefined = onlyId): { items: Entry[]; skipped: string[] } {
  const skipped: string[] = [];
  if (one != null) {
    const e = m.items.find((i) => i.sb_id === one);
    if (!e) throw new Error(`item ${one} is not in the manifest`);
    return { items: [e], skipped };
  }
  const items = m.items
    .filter((e) => !e.removed_at && (e.state === 'downloaded' || e.state === 'changed'))
    .filter((e) => !category || e.category === category)
    .filter((e) => !flag('--summaries') || isSummaryOnly(e))
    .filter((e) => {
      if ((e.pages ?? 0) > MAX_PAGES && !force) {
        skipped.push(`${e.sb_id}: ${e.pages} pages, over ${MAX_PAGES}; run it with --id ${e.sb_id} --force if wanted`);
        return false;
      }
      return true;
    })
    .sort((a, b) => rank(a) - rank(b) || yearOf(b) - yearOf(a) || b.sb_id - a.sb_id);
  return { items, skipped };
}

/** The document to read: the PDF, or a text copy of a Word file, which the Read tool cannot open. */
async function sourceFile(e: Entry): Promise<string> {
  const raw = rawPath(e.sb_id, e.file_name ?? '');
  if (!existsSync(raw)) throw new Error(`${relative(ROOT, raw)} is not downloaded; run npm run kb:fetch`);
  if (/\.pdf$/i.test(raw)) return raw;
  const text = join(WORK, `${e.sb_id}.txt`);
  await run('textutil', ['-convert', 'txt', '-output', text, raw]);
  return text;
}

function prompt(e: Entry, file: string, coverage: 'full' | 'summary', dir: string): string {
  // An item never sees its own existing file, so a redo of an example is a fair test.
  const examples = coverage === 'full'
    ? ['2002/514-pagsusunog-ng-basura.md', '2024/694-mental-health-task-force.md']
    : ['1994/23-annual-budget-1994.md'];
  const example = examples.find((x) => !x.includes(`/${e.sb_id}-`)) ?? examples[0];
  const pdf = file.endsWith('.pdf');
  const reading = !pdf
    ? `It is a text copy of a Word document, so it has no pages: leave out the page markers and set source.pages to null.`
    : (e.pages ?? 0) > RANGE
      ? `It has ${e.pages} pages. Read it in ranges of at most ${RANGE} pages ("1-${RANGE}", "${RANGE + 1}-${RANGE * 2}", and so on) until you have read every page.`
      : `It has ${e.pages ?? 'an unknown number of'} pages.`;
  const entry = {
    sb_id: e.sb_id, title: e.title, number_listed: e.number_listed, description: e.description, category: e.category,
    page_url: e.page_url, file_url: e.file_url, sha256: e.sha256, pages: pdf ? e.pages : null,
    fetched_at: e.fetched_at?.slice(0, 10) ?? null,
  };
  return [
    `Transcribe one document from the Carmona SB Office library.`,
    ``,
    `1. Read knowledge/TRANSCRIPTION.md and follow it exactly. Then read the example knowledge/ordinances/${example} and match its shape. Do not open any other file under knowledge/ordinances/.`,
    `2. Write a ${coverage === 'full' ? 'full transcription (coverage: full)' : 'summary-only file (coverage: summary)'}.`,
    `3. The document is ${relative(ROOT, file)}. ${reading}`,
    `4. Its manifest entry: ${JSON.stringify(entry)}`,
    `5. In the frontmatter, set transcription.by to "claude", transcription.date to ${today()}, and transcription.reviewed to false. Copy source.fetched_at as given in the entry.`,
    `6. Write exactly one file, ${out ? dir : relative(ROOT, dir)}/{year}/${e.sb_id}-{slug}.md, with the year and slug chosen as the guide says. Write no other file.`,
    `7. When the file is written, reply with its path and nothing else.`,
  ].join('\n');
}

async function transcribe(e: Entry, coverage: 'full' | 'summary', dir: string): Promise<{ path?: string; error?: string; cost?: number }> {
  const file = await sourceFile(e);
  const started = Date.now();
  const writable = `Edit(/${resolve(dir)}/**)`;
  const cli = [
    '-p', prompt(e, file, coverage, dir),
    '--tools', 'Read,Write',
    '--allowedTools', 'Read', writable,
    '--permission-mode', 'dontAsk',
    '--output-format', 'json',
    '--no-session-persistence',
    '--strict-mcp-config',
    ...(out ? ['--add-dir', dir] : []),
    ...(model ? ['--model', model] : []),
  ];
  let reply: { result?: string; is_error?: boolean; total_cost_usd?: number };
  try {
    const { stdout } = await run('claude', cli, { cwd: ROOT, timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });
    reply = JSON.parse(stdout);
  } catch (err) {
    const stdout = (err as { stdout?: string }).stdout;
    try {
      reply = JSON.parse(stdout ?? '');
    } catch {
      return { error: err instanceof Error ? err.message.split('\n')[0] : String(err) };
    }
  }
  const written = existing(e.sb_id, dir);
  if (!written || statSync(written).mtimeMs < started) {
    return { error: `no file written${reply.result ? `: ${reply.result.slice(0, 200)}` : ''}`, cost: reply.total_cost_usd };
  }
  return { path: written, cost: reply.total_cost_usd, error: reply.is_error ? reply.result?.slice(0, 200) : undefined };
}

async function main() {
  mkdirSync(WORK, { recursive: true });
  const m = loadManifest(LIBRARY);
  const byId = new Map(m.items.map((e) => [e.sb_id, e]));
  const { items, skipped } = queue(m);
  const done: string[] = [];
  const failed: string[] = [];
  let attempted = 0;
  let cost = 0;

  for (const e of items) {
    if (attempted >= limit) break;
    const dir = out ?? ORDINANCES;
    const current = existing(e.sb_id, dir);
    if (current && !(redo || force || e.state === 'changed')) {
      skipped.push(`${e.sb_id}: ${relative(ROOT, current)} exists; use --redo to replace it`);
      continue;
    }
    if (current && isReviewed(current) && !force) {
      skipped.push(`${e.sb_id}: ${relative(ROOT, current)} is reviewed; use --force to replace it`);
      continue;
    }
    if (!e.file_name || !e.sha256 || e.state === 'missing-file') {
      skipped.push(`${e.sb_id}: no downloaded file`);
      continue;
    }
    if (flag('--full') && onlyId === undefined) throw new Error('--full works only with --id');
    const coverage = isSummaryOnly(e) && !flag('--full') ? 'summary' : 'full';
    attempted++;
    console.log(`${e.sb_id} (${coverage}, ${e.pages ?? '?'} pages): ${e.title.slice(0, 80)}`);
    if (dry) continue;

    const backup = current ? join(WORK, `${e.sb_id}.previous.md`) : undefined;
    if (current && backup) renameSync(current, backup);
    const result = await transcribe(e, coverage, dir);
    cost += result.cost ?? 0;
    if (!result.path) {
      if (current && backup) renameSync(backup, current);
      failed.push(`${e.sb_id}: ${result.error}`);
      console.log(`  stopped: ${result.error}`);
      // Nothing was written, so the cause is likely the command itself, such as a usage limit. Stop the batch.
      break;
    }
    if (backup && existsSync(backup)) rmSync(backup);

    const rel = relative(ROOT, result.path);
    const problems = fileProblems(out ? relative(out, result.path) : rel, readFileSync(result.path, 'utf8'), byId).problems;
    if (out) {
      console.log(`  wrote ${result.path}${problems.length ? `, with problems:\n    ${problems.join('\n    ')}` : ''}`);
      (problems.length ? failed : done).push(`${e.sb_id}: ${result.path}`);
      continue;
    }
    e.transcript = rel;
    if (problems.length || result.error) {
      e.state = 'needs-attention';
      e.attention = [result.error, ...problems].filter(Boolean).join('; ');
      failed.push(`${e.sb_id}: ${e.attention}`);
      console.log(`  needs attention: ${e.attention}`);
    } else {
      e.state = coverage === 'full' ? 'transcribed' : 'summarized';
      delete e.attention;
      done.push(`${e.sb_id}: ${rel}`);
      console.log(`  ${e.state}: ${rel}`);
    }
    saveManifest(m);
  }

  const left = queue(loadManifest(LIBRARY), null).items.length;
  console.log(`\nDone ${done.length}, failed ${failed.length}, skipped ${skipped.length}. ${left} items left in the queue.`);
  if (cost) console.log(`Reported cost: $${cost.toFixed(2)}`);
  for (const s of skipped) console.log(`  skipped ${s}`);
  for (const f of failed) console.log(`  failed ${f}`);
  if (failed.length) exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  exit(1);
});
