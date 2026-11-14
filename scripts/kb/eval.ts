/**
 * The test set for the chat assistant, in two stages. Search results don't change when only the model
 * changes, so the retrieval stage saves them, and the answers stage reuses them for every model.
 *
 *   npm run kb:eval -- --retrieval                         search each question once, save the results
 *   npm run kb:eval -- --retrieval --refresh               search again
 *   npm run kb:eval -- --retrieval --type keyword          keyword search instead of hybrid
 *   npm run kb:eval -- --answers --model @cf/google/gemma-4-26b-a4b-it
 *   ... --limit 5, --only q01,q10, --budget 3000 (Neurons), --max-searches 100
 *
 * The answers stage runs the Worker's own code: the search query, the passage selection, the prompt,
 * the model request, and the reply check are imported from worker/, not copied. Every run says how many
 * searches and roughly how many Neurons it will use before it starts, and stops if that is over budget.
 * Each run writes a report with every answer in full to knowledge/eval/reports/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argv, exit } from 'node:process';
import { pathToFileURL } from 'node:url';
import { MAX_PASSAGES, NEURON_RATES, SCORE_THRESHOLD } from '../../worker/config.ts';
import type { Turn } from '../../worker/input.ts';
import { modelRequest, readModelOutput } from '../../worker/model.ts';
import { buildMessages } from '../../worker/prompt.ts';
import { searchQuery } from '../../worker/query.ts';
import { buildReply, notFound, type ChatReply, type IndexEntry } from '../../worker/reply.ts';
import { selectPassages, type Passage } from '../../worker/search.ts';
import { AiSearchClient, AuthError, loadSettings } from './ai-search.ts';
import { KB } from './build.ts';
import { ROOT, today } from './manifest.ts';

export const QUESTIONS = join(ROOT, 'knowledge/eval/questions.json');
const REPORTS = join(ROOT, 'knowledge/eval/reports');
const CACHE = join(KB, 'eval-cache');
/** Results saved per search: more than the Worker uses, so the threshold and count can be tuned without searching again. */
const SAVED_RESULTS = 10;
/** A rough answer size, for the estimate printed before a run. */
const EST_INPUT_TOKENS = 3500;
const EST_OUTPUT_TOKENS = 300;

export interface Question {
  id: string;
  language: 'en' | 'tl' | 'taglish';
  group?: string;
  turns: string[];
  expect_kind: string[];
  must_cite: string[][];
  must_feature: string | null;
  must_contain: string[][];
  must_not_contain: string[];
  must_notice?: string[];
  first_line_contains?: string[];
  note?: string;
  smoke?: boolean;
}

interface Saved {
  query: string;
  type: string;
  kb_version: string;
  results: Passage[];
}

const args = argv.slice(2);
const flag = (n: string) => args.includes(n);
const option = (n: string) => (flag(n) ? args[args.indexOf(n) + 1] : undefined);

export function loadQuestions(): Question[] {
  return (JSON.parse(readFileSync(QUESTIONS, 'utf8')) as { questions: Question[] }).questions;
}

function loadIndex(): { version: string; documents: Record<string, IndexEntry> } {
  return JSON.parse(readFileSync(join(KB, 'kb-index.json'), 'utf8'));
}

const loadGlossary = () => JSON.parse(readFileSync(join(KB, 'glossary.json'), 'utf8')) as Record<string, string[]>;
const cachePath = (type: string, id: string, turn: number) => join(CACHE, type, `${id}-${turn + 1}.json`);
const matches = (key: string, want: string) => (want.endsWith('/') ? key.startsWith(want) : key === want);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

/** The user turns as history for turn `i`, with the assistant's earlier replies where they exist. */
function historyFor(q: Question, i: number, replies: string[]): Turn[] {
  const h: Turn[] = [];
  for (let t = 0; t < i; t++) {
    h.push({ role: 'user', content: q.turns[t] });
    if (replies[t] !== undefined) h.push({ role: 'assistant', content: replies[t].slice(0, 500) });
  }
  return h;
}

// Checks

/**
 * Figures in an answer that its cited passages don't contain: peso amounts, other figures with commas or
 * decimals, phone numbers, years, and names with a middle initial. Each is a likely invention.
 */
export function safetyFlags(answer: string, cited: string): string[] {
  const source = cited.replace(/\s+/g, '').toLowerCase();
  const plain = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const found = new Set<string>();
  const patterns = [
    /(?:PHP|Php|P|₱)\s?\d[\d,]*(?:\.\d+)?/g,
    /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+\.\d{2}\b/g,
    /\b0\d{2,3}[- ]?\d{3}[- ]?\d{4}\b|\b\d{3}-\d{4}\b/g,
    /\b(?:19|20)\d{2}\b/g,
    /\b[A-Z][a-z]+(?: [A-Z][a-z]+)* [A-Z]\. [A-Z][a-z]+(?: Jr\.)?/g,
  ];
  for (const re of patterns) {
    for (const m of answer.match(re) ?? []) {
      const digits = m.replace(/^(?:PHP|Php|P|₱)\s?/, '');
      if (!source.includes(plain(m)) && !source.includes(plain(digits))) found.add(m.trim());
    }
  }
  return [...found];
}

export interface Verdict {
  pass: boolean;
  reasons: string[];
  safety: string[];
}

export function judge(q: Question, reply: ChatReply, citedText: string): Verdict {
  const reasons: string[] = [];
  if (!q.expect_kind.includes(reply.kind)) reasons.push(`kind ${reply.kind}, expected ${q.expect_kind.join(' or ')}`);
  const cited = reply.sources.map((s) => s.key ?? '');
  for (const group of q.must_cite) {
    if (!cited.some((k) => group.some((g) => matches(k, g)))) reasons.push(`did not cite ${group.join(' or ')}`);
  }
  const f = reply.featured?.site_url ?? null;
  if (q.must_feature && !(f === q.must_feature || f?.startsWith(`${q.must_feature}#`) || f?.startsWith(`${q.must_feature}/`))) {
    reasons.push(`featured ${f ?? 'nothing'}, expected ${q.must_feature}`);
  }
  const text = norm(reply.text);
  for (const group of q.must_contain) if (!group.some((g) => text.includes(norm(g)))) reasons.push(`missing ${group.join(' / ')}`);
  for (const bad of q.must_not_contain) if (text.includes(norm(bad))) reasons.push(`contains "${bad}"`);
  for (const n of q.must_notice ?? []) if (!reply.notices.includes(n as never)) reasons.push(`no ${n} notice`);
  if (q.first_line_contains) {
    const first = norm(reply.text.split('\n').find((l) => l.trim()) ?? '');
    if (!q.first_line_contains.some((g) => first.includes(norm(g)))) reasons.push(`first line lacks ${q.first_line_contains.join(' / ')}`);
  }
  const safety = safetyFlags(reply.text, citedText);
  if (safety.length) reasons.push(`not in its sources: ${safety.join(', ')}`);
  return { pass: reasons.length === 0, reasons, safety };
}

// Stages

function selected(): Question[] {
  let qs = loadQuestions();
  const only = option('--only');
  if (only) qs = qs.filter((q) => only.split(',').includes(q.id));
  const limit = option('--limit');
  if (limit) qs = qs.slice(0, Number(limit));
  return qs;
}

async function retrieval(client: AiSearchClient | null): Promise<void> {
  const type = option('--type') ?? 'hybrid';
  const index = loadIndex();
  const glossary = loadGlossary();
  const qs = selected();
  const todo = qs.flatMap((q) => q.turns.map((_, i) => ({ q, i }))).filter(({ q, i }) => flag('--refresh') || !existsSync(cachePath(type, q.id, i)));
  const max = Number(option('--max-searches') ?? 100);
  console.log(`Retrieval (${type}): ${todo.length} searches to run, ${qs.reduce((n, q) => n + q.turns.length, 0) - todo.length} saved. Search allowance: 1,000 a month.`);
  if (todo.length > max) throw new Error(`That is more than --max-searches ${max}. Raise it, or use --limit or --only.`);
  if (todo.length && !client) throw new Error('No search client.');
  for (const { q, i } of todo) {
    const query = searchQuery(q.turns[i], historyFor(q, i, []), glossary);
    // Every result, with no threshold at either stage, so the threshold can be tuned on saved results.
    const chunks = await client!.search(query, { retrieval_type: type, max_num_results: SAVED_RESULTS, match_threshold: 0 }, { enabled: true, match_threshold: 0 });
    const saved: Saved = { query, type, kb_version: index.version, results: chunks.map((c) => ({ key: c.item.key, text: c.text, score: c.score })) };
    mkdirSync(join(CACHE, type), { recursive: true });
    writeFileSync(cachePath(type, q.id, i), `${JSON.stringify(saved, null, 2)}\n`);
  }

  const lines = [`# Retrieval, ${type} search, ${today()}`, '', `Index version ${index.version}. Top ${MAX_PASSAGES}, threshold ${SCORE_THRESHOLD}.`, ''];
  const byLang: Record<string, { n: number; top: number; kept: number }> = {};
  const misses: string[] = [];
  let stale = 0;
  for (const q of qs.filter((x) => x.must_cite.length)) {
    const i = q.turns.length - 1;
    const saved = JSON.parse(readFileSync(cachePath(type, q.id, i), 'utf8')) as Saved;
    if (saved.kb_version !== index.version) stale++;
    const top = saved.results.slice(0, MAX_PASSAGES).map((r) => r.key);
    const kept = selectPassages(saved.results, index.documents).map((r) => r.key);
    const hit = (keys: string[]) => q.must_cite.every((g) => keys.some((k) => g.some((w) => matches(k, w))));
    const l = (byLang[q.language] ??= { n: 0, top: 0, kept: 0 });
    l.n++;
    if (hit(top)) l.top++;
    if (hit(kept)) l.kept++;
    else misses.push(`- ${q.id} (${q.language}) "${q.turns.at(-1)}": wanted ${q.must_cite.map((g) => g.join(' or ')).join('; ')}. Got ${saved.results.slice(0, MAX_PASSAGES).map((r) => `${r.key} ${r.score.toFixed(2)}`).join(', ') || 'nothing'}`);
  }
  lines.push('| Language | Questions | Expected in top 6 | Kept after threshold |', '|---|---|---|---|');
  for (const [lang, l] of Object.entries(byLang)) lines.push(`| ${lang} | ${l.n} | ${l.top} (${Math.round((100 * l.top) / l.n)}%) | ${l.kept} (${Math.round((100 * l.kept) / l.n)}%) |`);
  lines.push('', misses.length ? '## Misses' : 'No misses.', '', ...misses);
  if (stale) lines.push('', `${stale} saved searches are from an older index version. Run with --refresh to search again.`);
  const report = lines.join('\n');
  console.log(`\n${report}`);
  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(join(REPORTS, `${today()}-retrieval-${type}.md`), `${report}\n`);
}

async function answers(client: AiSearchClient): Promise<void> {
  const model = option('--model');
  if (!model) throw new Error('--answers needs --model NAME');
  const rate = NEURON_RATES[model];
  if (!rate) throw new Error(`No Neuron rates for ${model} in worker/config.ts.`);
  const index = loadIndex();
  const qs = selected();
  const missing = qs.flatMap((q) => q.turns.map((_, i) => cachePath('hybrid', q.id, i))).filter((p) => !existsSync(p));
  if (missing.length) throw new Error(`${missing.length} searches are not saved yet. Run --retrieval first.`);
  const calls = qs.reduce((n, q) => n + q.turns.length, 0);
  const estimate = Math.ceil((calls * (EST_INPUT_TOKENS * rate.input + EST_OUTPUT_TOKENS * rate.output)) / 1_000_000);
  const budget = Number(option('--budget') ?? 3000);
  console.log(`Answers with ${model}: ${calls} model calls, 0 searches, about ${estimate} Neurons (budget ${budget}; the free allowance is 10,000 a day).`);
  if (estimate > budget) throw new Error(`The estimate is over --budget ${budget}. Use --limit, --only, or a larger --budget, or spread the run over days.`);

  const rows: { q: Question; reply: ChatReply; verdict: Verdict; inTok: number; outTok: number; neurons: number; ms: number; error?: string }[] = [];
  for (const q of qs) {
    const replies: string[] = [];
    let reply: ChatReply = notFound();
    let inTok = 0, outTok = 0, neurons = 0, ms = 0;
    let citedText = '';
    let error: string | undefined;
    for (let i = 0; i < q.turns.length; i++) {
      const saved = JSON.parse(readFileSync(cachePath('hybrid', q.id, i), 'utf8')) as Saved;
      const passages = selectPassages(saved.results, index.documents);
      const history = historyFor(q, i, replies);
      if (!passages.length) {
        reply = notFound();
      } else {
        const labelled = passages.map((p, n) => ({ label: `S${n + 1}`, kind: index.documents[p.key].kind, title: index.documents[p.key].title, text: p.text }));
        const t = Date.now();
        try {
          const out = await client.run(model, modelRequest(model, buildMessages(labelled, history, q.turns[i])));
          ms += Date.now() - t;
          const read = readModelOutput(out);
          const usage = (out.usage ?? {}) as { neurons?: number };
          inTok += read.inputTokens;
          outTok += read.outputTokens;
          neurons += usage.neurons ?? (read.inputTokens * rate.input + read.outputTokens * rate.output) / 1_000_000;
          reply = buildReply(read.text, passages.map((p) => p.key), index.documents);
          const citedKeys = new Set(reply.sources.map((s) => s.key));
          citedText = passages.filter((p) => citedKeys.has(p.key)).map((p) => p.text).join('\n');
        } catch (err) {
          if (err instanceof AuthError) throw err;
          error = err instanceof Error ? err.message : String(err);
          reply = notFound();
        }
      }
      replies.push(reply.text);
    }
    const verdict = judge(q, reply, citedText);
    if (error) {
      verdict.reasons.unshift(`model error: ${error}`);
      verdict.pass = false;
    }
    rows.push({ q, reply, verdict, inTok, outTok, neurons, ms, error });
    console.log(`  ${verdict.pass ? 'pass' : 'FAIL'} ${q.id} (${q.language})${verdict.pass ? '' : `: ${verdict.reasons.join('; ')}`}`);
  }
  writeReport(model, rows, index.version);
}

function writeReport(model: string, rows: { q: Question; reply: ChatReply; verdict: Verdict; inTok: number; outTok: number; neurons: number; ms: number; error?: string }[], version: string): void {
  const pct = (a: number, b: number) => (b ? `${a} of ${b} (${Math.round((100 * a) / b)}%)` : 'none');
  const langs = ['en', 'tl', 'taglish'];
  const refusal = rows.filter((r) => r.q.expect_kind.every((k) => k === 'out_of_scope' || k === 'not_found'));
  const featured = rows.filter((r) => r.q.must_feature);
  const featuredOk = featured.filter((r) => !r.verdict.reasons.some((x) => x.startsWith('featured')));
  const safety = rows.reduce((n, r) => n + r.verdict.safety.length, 0);
  const called = rows.filter((r) => r.inTok);
  const avg = (f: (r: (typeof rows)[number]) => number) => (called.length ? Math.round(called.reduce((n, r) => n + f(r), 0) / called.length) : 0);
  const total = rows.reduce((n, r) => n + r.neurons, 0);
  const lines = [
    `# Answers: ${model}, ${today()}`,
    '',
    `Index version ${version}. ${rows.length} questions. Threshold ${SCORE_THRESHOLD}, top ${MAX_PASSAGES}.`,
    '',
    '| Measure | Result |',
    '|---|---|',
    ...langs.map((l) => `| Pass rate, ${l} | ${pct(rows.filter((r) => r.q.language === l && r.verdict.pass).length, rows.filter((r) => r.q.language === l).length)} |`),
    `| Pass rate, all | ${pct(rows.filter((r) => r.verdict.pass).length, rows.length)} |`,
    `| Featured page as expected | ${pct(featuredOk.length, featured.length)} |`,
    `| **Safety: figures not in their sources** | **${safety}** |`,
    `| Refusals and not found | ${pct(refusal.filter((r) => r.verdict.pass).length, refusal.length)} |`,
    `| Average tokens per answer, in / out | ${avg((r) => r.inTok)} / ${avg((r) => r.outTok)} |`,
    `| Neurons per answer, average / run total | ${called.length ? (total / called.length).toFixed(1) : 0} / ${total.toFixed(0)} |`,
    `| Average model time | ${(avg((r) => r.ms) / 1000).toFixed(1)} s |`,
    '',
    '## Every answer',
    '',
  ];
  for (const r of rows) {
    lines.push(`### ${r.q.id} (${r.q.language}): ${r.verdict.pass ? 'pass' : 'FAIL'}`, '');
    r.q.turns.forEach((t, i) => lines.push(`${r.q.turns.length > 1 ? `Turn ${i + 1}: ` : ''}> ${t}`));
    lines.push('', `Kind: ${r.reply.kind}. Featured: ${r.reply.featured?.site_url ?? 'none'}. Notices: ${r.reply.notices.join(', ') || 'none'}.`);
    if (!r.verdict.pass) lines.push(`Why it failed: ${r.verdict.reasons.join('; ')}.`);
    if (r.q.note) lines.push(`Expected: ${r.q.note}`);
    lines.push('', r.reply.text ? r.reply.text.split('\n').map((l) => `    ${l}`).join('\n') : '    (no text: the panel shows its own "not found" line)', '');
    if (r.reply.sources.length) lines.push(`Sources: ${r.reply.sources.map((s) => `[${s.n}] ${s.key}`).join(', ')}`, '');
  }
  mkdirSync(REPORTS, { recursive: true });
  const file = join(REPORTS, `${today()}-${model.split('/').pop()}.md`);
  writeFileSync(file, `${lines.join('\n')}\n`);
  console.log(`\n${lines.slice(4, 16).join('\n')}\n\nReport: ${file.slice(ROOT.length + 1)}`);
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  (async () => {
    const needsClient = flag('--answers') || flag('--retrieval');
    if (!needsClient) throw new Error('Use --retrieval or --answers --model NAME.');
    const client = new AiSearchClient(loadSettings());
    if (flag('--retrieval')) await retrieval(client);
    if (flag('--answers')) await answers(client);
  })().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    exit(1);
  });
}
