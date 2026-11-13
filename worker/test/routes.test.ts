/** The Worker's routes: the switch, unknown paths, and that only /api/* runs code. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../index.ts';
import type { Env } from '../env.ts';
import { ORIGIN } from './helpers.ts';

const env = (over: Partial<Env> = {}) =>
  ({ ASSETS: { fetch: async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }) }, ...over }) as unknown as Env;
const call = (path: string, init: RequestInit = {}, e = env()) => worker.fetch(new Request(`${ORIGIN}${path}`, init), e);

test('with CHAT_ENABLED unset, status says off and every other chat route is 503', async () => {
  const status = await call('/api/chat/status');
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { enabled: false, limits: { question_chars: 500 } });
  assert.equal(status.headers.get('cache-control'), 'no-store');
  for (const path of ['/api/chat', '/api/chat/session', '/api/chat/feedback']) {
    const res = await call(path, { method: 'POST', body: '{}' });
    assert.equal(res.status, 503, path);
    assert.deepEqual(await res.json(), { error: 'disabled' });
  }
  const on = await call('/api/chat/status', {}, env({ CHAT_ENABLED: 'yes' }));
  assert.equal(((await on.json()) as { enabled: boolean }).enabled, false, 'only "true" turns it on');
});

test('an unknown /api path is a JSON 404, not index.html', async () => {
  const res = await call('/api/nothing');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});

test('anything outside /api goes to the static assets', async () => {
  const res = await call('/services/registration-of-live-birth');
  assert.equal(await res.text(), '<html>');
});

test('when on but missing a secret, the chat is unavailable rather than open', async () => {
  const res = await call('/api/chat', { method: 'POST', body: '{}' }, env({ CHAT_ENABLED: 'true' }));
  assert.equal(res.status, 503);
});
