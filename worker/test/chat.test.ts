/** The whole chat path, with fixtures: every check, every limit, and what is kept. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chat, createSession, feedback, safeToCache } from '../chat.ts';
import { KEYWORD_PER_MONTH, PER_IP_PER_DAY, SEMANTIC_PER_MONTH, SITE_PER_DAY } from '../config.ts';
import { FixtureModel } from '../model.ts';
import { utcMonth } from '../store.ts';
import { ask, IP, makeDeps, NOW, post, sessionFor } from './helpers.ts';

const BIRTH = 'How do I register the birth of my newborn baby?';
const body = (o: { body: unknown }) => o.body as Record<string, unknown>;

test('a question answered from the birth registration service features its page as source 1', async () => {
  const deps = makeDeps();
  const out = await ask(deps, BIRTH);
  assert.equal(out.status, 200);
  const b = body(out);
  assert.equal(b.kind, 'answer');
  assert.deepEqual(b.featured, { title: 'Registration of Certificate of Live Birth', kind: 'service', site_url: '/services/registration-of-live-birth' });
  const sources = b.sources as { n: number; site_url: string; source_url: string }[];
  assert.equal(sources[0].n, 1);
  assert.equal(sources[0].site_url, '/services/registration-of-live-birth');
  assert.match(sources[0].source_url, /CC_2026\.pdf#page=60$/);
  assert.deepEqual(b.remaining, { today: PER_IP_PER_DAY - 1 });
});

test('no session, an expired one, or one for another IP gets 401', async () => {
  const deps = makeDeps();
  const plain = await chat(post('/api/chat', { message: BIRTH }), IP, deps);
  assert.deepEqual([plain.status, body(plain).error], [401, 'session']);
  const expired = await ask(deps, BIRTH, {}, await sessionFor(IP, NOW - 1));
  assert.equal(expired.status, 401);
  const other = await ask(deps, BIRTH, {}, await sessionFor('198.51.100.9'));
  assert.equal(other.status, 401);
  assert.equal(deps.search.calls.length, 0);
});

test('a request from another site gets 403', async () => {
  const deps = makeDeps();
  const req = post('/api/chat', { message: BIRTH }, { authorization: `Bearer ${await sessionFor()}`, origin: 'https://evil.example' });
  assert.deepEqual([(await chat(req, IP, deps)).status], [403]);
});

test('an oversize or malformed body gets 400 input', async () => {
  const deps = makeDeps();
  const auth = { authorization: `Bearer ${await sessionFor()}` };
  const big = await chat(post('/api/chat', JSON.stringify({ message: 'x', pad: 'y'.repeat(9000) }), auth), IP, deps);
  assert.deepEqual([big.status, body(big).error], [400, 'input']);
  const bad = await chat(post('/api/chat', '{not json', auth), IP, deps);
  assert.equal(bad.status, 400);
});

test('the 6th question in a minute gets slow_down, the 21st in a day gets daily_limit', async () => {
  const deps = makeDeps();
  for (let i = 0; i < 5; i++) assert.equal((await ask(deps, `${BIRTH} ${i}`)).status, 200);
  const sixth = await ask(deps, BIRTH);
  assert.deepEqual([sixth.status, body(sixth).error, body(sixth).retry_after], [429, 'slow_down', 60]);

  const daily = makeDeps({ limiter: { limit: async () => ({ success: true }) } });
  for (let i = 0; i < PER_IP_PER_DAY; i++) assert.equal((await ask(daily, `${BIRTH} ${i}`)).status, 200, `question ${i + 1}`);
  const over = await ask(daily, BIRTH);
  assert.deepEqual([over.status, body(over).error], [429, 'daily_limit']);
  assert.equal(body(over).retry_after, 20 * 3600);
});

test('the site limit gives site_busy', async () => {
  const deps = makeDeps();
  for (let i = 0; i < SITE_PER_DAY; i++) await deps.store.add('site-day', 'site', '2026-11-13');
  const out = await ask(deps, BIRTH);
  assert.deepEqual([out.status, body(out).error], [429, 'site_busy']);
});

test('semantic searches run out, then keyword searches, then monthly_limit with no search', async () => {
  const deps = makeDeps();
  const month = utcMonth(NOW);
  await deps.store.add('semantic-month', 'site', month, SEMANTIC_PER_MONTH);
  assert.equal((await ask(deps, `${BIRTH} 1`)).status, 200);
  assert.deepEqual(deps.search.calls, ['keyword']);
  await deps.store.add('keyword-month', 'site', month, KEYWORD_PER_MONTH);
  const out = await ask(deps, `${BIRTH} 2`);
  assert.deepEqual([out.status, body(out).error], [429, 'monthly_limit']);
  assert.deepEqual(deps.search.calls, ['keyword']);
});

test('a model citing S9 comes back as not_found', async () => {
  const deps = makeDeps({ model: new FixtureModel(JSON.stringify({ kind: 'answer', text: 'Pay P500. [S9]', sources: ['S9'] })) });
  const out = await ask(deps, BIRTH);
  assert.equal(body(out).kind, 'not_found');
  assert.equal(body(out).featured, null);
});

test('nothing found means not_found without calling the model', async () => {
  let called = false;
  const deps = makeDeps({ model: { name: 'spy', run: async () => ((called = true), { text: '', inputTokens: 0, outputTokens: 0 }) } });
  const out = await ask(deps, 'qwxzy plorbt');
  assert.equal(body(out).kind, 'not_found');
  assert.equal(called, false);
});

test('a repeated first question comes from the cache, without a search', async () => {
  const deps = makeDeps({ limiter: { limit: async () => ({ success: true }) } });
  await ask(deps, BIRTH);
  const again = await ask(deps, `  ${BIRTH.toUpperCase()}  `);
  assert.equal(body(again).kind, 'answer');
  assert.equal(deps.search.calls.length, 1);
  assert.deepEqual(body(again).remaining, { today: PER_IP_PER_DAY - 2 });
  const followUp = await ask(deps, BIRTH, { history: [{ role: 'user', content: 'hello' }] });
  assert.equal(followUp.status, 200);
  assert.equal(deps.search.calls.length, 2);
});

test('the store keeps counts and hashes, never the question or the IP; the log neither', async () => {
  const deps = makeDeps();
  const secret = 'Juan dela Cruz 0917 555 1234 birth';
  const out = await ask(deps, secret);
  const dump = JSON.stringify([...deps.store.counters.keys(), ...deps.store.cache.keys(), ...deps.store.feedbackCounts.keys()]);
  assert.doesNotMatch(dump, /Juan|0917|203\.0\.113\.7/);
  assert.doesNotMatch(JSON.stringify(out.log), /Juan|0917|203\.0\.113\.7|fixture answer/);
  for (const row of deps.store.cache.values()) assert.doesNotMatch(row.response, /Juan|0917/);
});

test('Turnstile: a passing token buys a session; an invalid or reused one does not', async () => {
  const siteverify = (result: object) => (async () => new Response(JSON.stringify(result))) as unknown as typeof fetch;
  const req = () => post('/api/chat/session', { turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX' });
  const ok = await createSession(req(), IP, makeDeps({ fetcher: siteverify({ success: true, hostname: 'example.com' }) }));
  assert.equal(ok.status, 200);
  const { session } = body(ok) as { session: string };
  assert.equal((await ask(makeDeps(), BIRTH, {}, session)).status, 200);
  const invalid = await createSession(req(), IP, makeDeps({ fetcher: siteverify({ success: false, 'error-codes': ['invalid-input-response'] }) }));
  assert.deepEqual([invalid.status, body(invalid).error], [403, 'turnstile']);
  const reused = await createSession(req(), IP, makeDeps({ fetcher: siteverify({ success: false, 'error-codes': ['timeout-or-duplicate'] }) }));
  assert.equal(reused.status, 403);
  const elsewhere = await createSession(req(), IP, makeDeps({ fixtures: false, fetcher: siteverify({ success: true, hostname: 'example.com' }) }));
  assert.equal(elsewhere.status, 403);
});

test('feedback adds one to a count', async () => {
  const deps = makeDeps();
  const auth = { authorization: `Bearer ${await sessionFor()}` };
  assert.equal((await feedback(post('/api/chat/feedback', { rating: 'up', kind: 'answer' }, auth), IP, deps)).status, 200);
  assert.equal((await feedback(post('/api/chat/feedback', { rating: 'up', kind: 'answer' }, auth), IP, deps)).status, 200);
  assert.deepEqual([...deps.store.feedbackCounts.values()], [2]);
  assert.equal((await feedback(post('/api/chat/feedback', { rating: 'up' }, auth), IP, deps)).status, 400);
});

test('a failing binding gives 503 unavailable, not a stack trace', async () => {
  const deps = makeDeps({ search: { calls: [], search: async () => { throw new Error('boom at line 1'); } } as never });
  const out = await ask(deps, BIRTH);
  assert.deepEqual(out.body, { error: 'unavailable' });
  assert.equal(out.status, 503);
});

test('a reply that repeats something only the user wrote is not cached', async () => {
  const echo = JSON.stringify({ kind: 'answer', text: 'Juan dela Cruz, register within 30 days. [S1]', sources: ['S1'] });
  const deps = makeDeps({ model: new FixtureModel(echo) });
  const out = await ask(deps, 'Ako si Juan dela Cruz, paano iparehistro ang birth certificate ng anak ko?');
  assert.equal(body(out).kind, 'answer');
  assert.equal(deps.store.cache.size, 0);
  const plain = makeDeps();
  await ask(plain, BIRTH);
  assert.equal(plain.store.cache.size, 1);
});

test('safeToCache: words from the sources are fine, the user\'s own are not', () => {
  const passages = ['Registration of Certificate of Live Birth within thirty (30) days. Call 0917-112-0291.'];
  assert.ok(safeToCache('How do I register a live birth?', passages, 'Register the live birth within thirty days.'));
  assert.equal(safeToCache('My number is 0917 555 1234', passages, 'We will call 555 1234.'), false);
  assert.ok(safeToCache('My number is 0917 555 1234', passages, 'Call 0917-112-0291.'));
});
