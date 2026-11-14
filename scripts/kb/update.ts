/**
 * The one command that brings the assistant up to date. In order, stopping at the first failure:
 * fetch new library items, transcribe the next few, validate, build the search documents, sync them to
 * AI Search, and ask three test questions.
 *
 *   npm run kb:update                  transcribes up to 10 new items
 *   npm run kb:update -- --convert 3   up to 3
 *   npm run kb:update -- --convert 0   none: only fetch, build, and sync
 *   npm run kb:update -- --no-fetch    skip the SB Office library
 */
import { spawnSync } from 'node:child_process';
import { argv, exit } from 'node:process';
import { SCORE_THRESHOLD } from '../../worker/config.ts';
import { AiSearchClient, AuthError, loadSettings } from './ai-search.ts';
import { build } from './build.ts';
import { loadManifest, ROOT } from './manifest.ts';
import { LIBRARY } from './sb-office.ts';
import { sync } from './sync.ts';
import { indexProblems, keywordProblems, validate } from './validate.ts';

/** Three questions and the document each should find first. A path ending in "/" matches any document under it. */
const SMOKE = [
  { question: 'pagsisiga ng basura', expect: 'ordinances/514.md' },
  { question: 'registration of live birth', expect: 'services/registration-of-live-birth.md' },
  { question: 'emergency hotline number', expect: 'hotlines/' },
];

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

  step('Ask three test questions');
  const client = new AiSearchClient(loadSettings());
  let answered = 0;
  for (const t of SMOKE) {
    const top = (await client.search(t.question, { max_num_results: 3, match_threshold: SCORE_THRESHOLD }))[0];
    const ok = top !== undefined && (t.expect.endsWith('/') ? top.item.key.startsWith(t.expect) : top.item.key === t.expect);
    if (ok) answered++;
    console.log(`  ${ok ? 'ok  ' : 'MISS'} "${t.question}": ${top ? `${top.item.key} (${top.score.toFixed(2)})` : 'nothing found'}`);
  }

  const after = counts();
  const transcribed = after.done - before.done;
  const parts = [
    transcribed ? `${transcribed} new ordinance file${transcribed === 1 ? '' : 's'} written and need${transcribed === 1 ? 's' : ''} review.` : 'No new ordinance files.',
    after.attention ? `${after.attention} need${after.attention === 1 ? 's' : ''} attention (npm run kb:status).` : '',
    `${s.uploaded.length} document${s.uploaded.length === 1 ? '' : 's'} uploaded, ${s.deleted.length} deleted.`,
    `Search answered ${answered} of ${SMOKE.length}.`,
  ];
  console.log(`\n${parts.filter(Boolean).join(' ')}`);
  if (answered < SMOKE.length) exit(1);
}

main().catch((err) => {
  console.error(`\n${err instanceof StepFailed || err instanceof AuthError ? err.message : err instanceof Error ? err.stack : err}`);
  exit(1);
});
