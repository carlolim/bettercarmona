/** Session signing, input checks, counters, glossary expansion, passage selection, and the message layout. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expandQuestion } from '../glossary.ts';
import { checkChatInput, checkFeedback } from '../input.ts';
import { neurons } from '../model.ts';
import { buildMessages, LANGUAGE_REMINDER } from '../prompt.ts';
import { dailyIpHash, sessionIpHash, signSession, verifySession } from '../session.ts';
import { MemoryStore, secondsToMidnight, secondsToMonthEnd, utcDay, utcMonth } from '../store.ts';
import { selectPassages } from '../search.ts';
import { allowedHostname } from '../turnstile.ts';
import { GLOSSARY, IP, NOW, SECRETS } from './helpers.ts';

test('a signed session verifies for its IP until it expires', async () => {
  const ip = await sessionIpHash(IP, SECRETS.salt);
  const token = await signSession({ id: 'a', exp: NOW + 1000, ip }, SECRETS.session);
  assert.ok(await verifySession(token, SECRETS.session, ip, NOW));
  assert.equal(await verifySession(token, SECRETS.session, ip, NOW + 1000), null, 'expired');
  assert.equal(await verifySession(token, 'another-secret', ip, NOW), null, 'wrong secret');
  assert.equal(await verifySession(token, SECRETS.session, await sessionIpHash('198.51.100.1', SECRETS.salt), NOW), null, 'other IP');
  const [body, sig] = token.split('.');
  const forged = `${btoa(JSON.stringify({ id: 'a', exp: NOW + 99_999_999, ip })).replace(/=+$/, '')}.${sig}`;
  assert.equal(await verifySession(forged, SECRETS.session, ip, NOW), null, 'changed payload');
  assert.equal(await verifySession(`${body}.${sig}.x`, SECRETS.session, ip, NOW), null, 'extra part');
  assert.equal(await verifySession('garbage', SECRETS.session, ip, NOW), null);
});

test('IP hashes never contain the IP, and the daily one changes with the day', async () => {
  const a = await dailyIpHash(IP, '2026-11-13', SECRETS.salt);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes(IP));
  assert.notEqual(a, await dailyIpHash(IP, '2026-11-14', SECRETS.salt));
});

test('chat input: message, history, and locale', () => {
  assert.deepEqual(checkChatInput({ message: '  Paano mag-renew?  ' }), { message: 'Paano mag-renew?', history: [], locale: 'en' });
  assert.equal(checkChatInput({ message: '   ' }), null);
  assert.equal(checkChatInput({ message: 'x'.repeat(501) }), null);
  assert.ok(checkChatInput({ message: 'x'.repeat(500) }));
  const turn = { role: 'user', content: 'hi' };
  assert.ok(checkChatInput({ message: 'q', history: Array(6).fill(turn) }));
  assert.equal(checkChatInput({ message: 'q', history: Array(7).fill(turn) }), null);
  assert.equal(checkChatInput({ message: 'q', history: [{ role: 'system', content: 'x' }] }), null);
  assert.equal(checkChatInput({ message: 'q', history: [{ role: 'user', content: 'x'.repeat(501) }] }), null);
  assert.equal(checkChatInput({ message: 'q', locale: 'es' }), null);
  assert.equal(checkChatInput(['q']), null);
  assert.deepEqual(checkFeedback({ rating: 'up', kind: 'answer' }), { rating: 'up', kind: 'answer' });
  assert.equal(checkFeedback({ rating: 'meh', kind: 'answer' }), null);
});

test('counters add and read by scope, key, and period', async () => {
  const s = new MemoryStore();
  assert.equal(await s.add('ip-day', 'k', '2026-11-13'), 1);
  assert.equal(await s.add('ip-day', 'k', '2026-11-13'), 2);
  assert.equal(await s.add('neurons-day', 'site', '2026-11-13', 32), 32);
  assert.equal(await s.get('ip-day', 'k', '2026-11-14'), 0);
  assert.equal(utcDay(NOW), '2026-11-13');
  assert.equal(utcMonth(NOW), '2026-11');
  assert.equal(secondsToMidnight(NOW), 20 * 3600);
  assert.equal(secondsToMonthEnd(Date.UTC(2026, 10, 30, 23, 0, 0)), 3600);
});

test('Neurons from token counts', () => {
  assert.equal(neurons('@cf/google/gemma-4-26b-a4b-it', 2500, 350), 33);
  assert.throws(() => neurons('unknown-model', 1, 1));
});

test('glossary expansion adds the other side, on whole words only', () => {
  assert.match(expandQuestion('Magkano ang amilyar?', GLOSSARY), /real property tax/);
  assert.match(expandQuestion('Where do I pay real property tax?', GLOSSARY), /amilyar/);
  assert.equal(expandQuestion('A familiar question', GLOSSARY), 'A familiar question');
});

test("Turnstile hostnames: the site, this account's workers.dev address, and test hosts only in fixture mode", () => {
  assert.ok(allowedHostname('bettercarmona.org', false));
  assert.ok(allowedHostname('bettercarmona.cryptoemail64.workers.dev', false));
  assert.equal(allowedHostname('bettercarmona.someone.workers.dev', false), false);
  assert.equal(allowedHostname('main-bettercarmona.cryptoemail64.workers.dev', false), false);
  assert.equal(allowedHostname('example.com', false), false);
  assert.ok(allowedHostname('example.com', true));
  assert.equal(allowedHostname('evil.example', true), false);
});

test('passages pass the threshold, or come from a document that has one that does', () => {
  const docs = { 'a.md': {}, 'b.md': {}, 'c.md': {} } as unknown as Parameters<typeof selectPassages>[1];
  const found = [
    { key: 'a.md', text: 'a1', score: 0.5 },
    { key: 'gone.md', text: 'not in the index', score: 0.4 },
    { key: 'b.md', text: 'b1', score: 0.05 },
    { key: 'a.md', text: 'a2', score: 0.02 },
    { key: 'c.md', text: 'c1', score: 0.01 },
  ];
  assert.deepEqual(selectPassages(found, docs, 0.1).map((p) => p.text), ['a1', 'a2']);
  assert.deepEqual(selectPassages(found, docs, 0.6), [], 'nothing passes, so nothing comes along');
  assert.deepEqual(selectPassages(found, docs, 0.01, 2).map((p) => p.text), ['a1', 'b1'], 'rank order and the cap');
});

test('the question is followed by the language reminder, so the model reads it last', () => {
  const messages = buildMessages([{ label: 'S1', kind: 'ordinance', title: 'Kautusan', text: 'Bawal magsunog.' }], [], 'Is burning allowed?');
  const last = messages.at(-1)!;
  assert.equal(last.role, 'user');
  assert.ok(last.content.endsWith(`QUESTION:\nIs burning allowed?\n\n${LANGUAGE_REMINDER}`));
});
