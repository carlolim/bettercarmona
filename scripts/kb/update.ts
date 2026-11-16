/**
 * The one command that brings the assistant up to date. In order, stopping at the first failure:
 * fetch new library items, transcribe the next few, validate, build the search documents, sync them to
 * AI Search, and search the five smoke questions from knowledge/eval/questions.json.
 *
 *   npm run kb:update                  transcribes up to 10 new items
 *   npm run kb:update -- --convert 3   up to 3
 *   npm run kb:update -- --convert 0   none: only fetch, build, and sync
 *   npm run kb:update -- --no-fetch    skip the SB Office library
 */
import { spawnSync } from 'node:child_process';
import { argv, exit } from 'node:process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_PASSAGES } from '../../worker/config.ts';
import { searchQuery } from '../../worker/query.ts';
import { selectPassages } from '../../worker/search.ts';
import { AiSearchClient, AuthError, loadSettings } from './ai-search.ts';
import { build, KB } from './build.ts';
import { loadQuestions } from './eval.ts';
import { loadManifest, ROOT } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';
import { sync } from './sync.ts';
import { indexProblems, keywordProblems, validate } from './validate.ts';

const args = argv.slice(2);
const convert = args.includes('--convert') ? Number(args[args.indexOf('--convert') + 1]) : 10;
const fetchLibrary = !args.includes('--no-fetch');

class StepFailed extends Error {}

function step(name: string) {
  console.log(`\n== ${name}`);
}

/** Runs one of the kb scripts as its own process, as a person would. */
function run(script: string, scriptArgs: string[]): void {
  const res = spawnSync('npx', ['tsx', `scripts/kb/${script}`, ...scriptArgs], { cwd: ROOT, stdio: 'inherit' });
  if (res.status !== 0) throw new StepFailed(`${script} failed. Fix what it reports above, then run npm run kb:update again.`);
}

function fail(problems: string[]): void {
  if (!problems.length) return;
  for (const p of problems) console.log(`  problem: ${p}`);
  throw new StepFailed('Validation failed. Fix what is named above, then run npm run kb:update again.');
}

const counts = () => {
  const items = loadManifest(LIBRARY).items;
  return {
    done: items.filter((e) => e.state === 'transcribed' || e.state === 'summarized').length,
    attention: items.filter((e) => e.state === 'needs-attention').length,
  };
};

async function main() {
  const before = counts();

  if (fetchLibrary) {
    step('Fetch new items from the SB Office library');
    run('fetch.ts', []);
  }
  if (convert > 0) {
    step(`Transcribe up to ${convert} items`);
    run('convert.ts', ['--limit', String(convert)]);
  }

  step('Validate the ordinance files');
  const { problems, warnings } = validate();
  console.log(`  ${warnings.length} warnings`);
  fail(problems);

  step('Build the search documents');
  const index = build();
  console.log(`  ${Object.keys(index.documents).length} documents, version ${index.version}`);
  fail([...indexProblems(), ...(await keywordProblems())]);

  step('Sync to AI Search');
  const s = await sync();
  console.log(`  uploaded ${s.uploaded.length}, deleted ${s.deleted.length}, unchanged ${s.unchanged}, failed ${s.failed.length}`);
  for (const f of s.failed) console.log(`  failed ${f}`);
  if (s.failed.length) throw new StepFailed('Some documents did not upload or index. Run npm run kb:sync to retry them.');

  step('Search the smoke questions');
  const client = new AiSearchClient(loadSettings());
  const smoke = loadQuestions().filter((q) => q.smoke);
  const glossary = JSON.parse(readFileSync(join(KB, 'glossary.json'), 'utf8')) as Record<string, string[]>;
  let answered = 0;
  for (const q of smoke) {
    const question = q.turns.at(-1)!;
    const chunks = await client.search(
      searchQuery(question, [], glossary),
      { max_num_results: MAX_PASSAGES, match_threshold: 0 },
      { enabled: true, match_threshold: 0 },
    );
    const kept = selectPassages(chunks.map((c) => ({ key: c.item.key, text: c.text, score: c.score })), index.documents);
    const ok = q.must_cite.every((group) => kept.some((p) => group.some((g) => (g.endsWith('/') ? p.key.startsWith(g) : p.key === g))));
    if (ok) answered++;
    console.log(`  ${ok ? 'ok  ' : 'MISS'} ${q.id} "${question}": ${kept[0] ? `${kept[0].key} (${kept[0].score.toFixed(2)})` : 'nothing found'}`);
  }

  const after = counts();
  const transcribed = after.done - before.done;
  const parts = [
    transcribed ? `${transcribed} new ordinance file${transcribed === 1 ? '' : 's'} written and need${transcribed === 1 ? 's' : ''} review.` : 'No new ordinance files.',
    after.attention ? `${after.attention} need${after.attention === 1 ? 's' : ''} attention (npm run kb:status).` : '',
    `${s.uploaded.length} document${s.uploaded.length === 1 ? '' : 's'} uploaded, ${s.deleted.length} deleted.`,
    `Search found the right document for ${answered} of ${smoke.length} test questions.`,
  ];
  console.log(`\n${parts.filter(Boolean).join(' ')}`);
  if (answered < smoke.length) exit(1);
}

main().catch((err) => {
  console.error(`\n${err instanceof StepFailed || err instanceof AuthError ? err.message : err instanceof Error ? err.stack : err}`);
  exit(1);
});
