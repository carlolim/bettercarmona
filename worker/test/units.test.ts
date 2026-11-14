/** Session signing, input checks, counters, and glossary expansion. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expandQuestion } from '../glossary.ts';
import { checkChatInput, checkFeedback } from '../input.ts';
import { neurons } from '../model.ts';
import { dailyIpHash, sessionIpHash, signSession, verifySession } from '../session.ts';
import { MemoryStore, secondsToMidnight, secondsToMonthEnd, utcDay, utcMonth } from '../store.ts';
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

test('Turnstile hostnames: the site, the preview, and test hosts only in fixture mode', () => {
  assert.ok(allowedHostname('bettercarmona.org', false));
  assert.ok(allowedHostname('bettercarmona.someone.workers.dev', false));
  assert.equal(allowedHostname('example.com', false), false);
  assert.ok(allowedHostname('example.com', true));
  assert.equal(allowedHostname('evil.example', true), false);
});
