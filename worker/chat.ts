/**
 * The chat routes. Every outside service comes in through `Deps`, so tests can run the whole path
 * with fixtures and an in-memory store. A failed check stops the request before anything costs.
 */
import {
  BODY_MAX_BYTES, CACHE_DAYS, KEYWORD_PER_MONTH, MAX_PASSAGES, NEURONS_PER_DAY, NEURON_RATES, PER_IP_PER_DAY,
  PREVIEW_HOSTNAME, QUESTION_MAX_CHARS, SCORE_THRESHOLD, SEMANTIC_PER_MONTH, SESSION_MINUTES, SITE_HOSTNAMES, SITE_PER_DAY,
} from './config.ts';
import { expandQuestion } from './glossary.ts';
import { checkChatInput, checkFeedback } from './input.ts';
import { neurons, type Model } from './model.ts';
import { buildMessages } from './prompt.ts';
import { buildReply, notFound, type ChatReply, type IndexEntry } from './reply.ts';
import type { Search, SearchType } from './search.ts';
import { dailyIpHash, randomId, sessionIpHash, sha256, signSession, verifySession } from './session.ts';
import { secondsToMidnight, secondsToMonthEnd, utcDay, utcMonth, type Store } from './store.ts';
import { verifyTurnstile } from './turnstile.ts';

export interface KbIndex {
  version: string;
  documents: Record<string, IndexEntry>;
}

export interface Deps {
  store: Store;
  search: Search;
  model: Model;
  limiter: { limit(options: { key: string }): Promise<{ success: boolean }> };
  index: KbIndex;
  glossary: Record<string, string[]>;
  secrets: { session: string; salt: string; turnstile: string };
  fixtures: boolean;
  now: () => number;
  fetcher?: typeof fetch;
}

/** What a route returns, and what the request log may say about it. Never the message, the answer, or the IP. */
export interface Outcome {
  status: number;
  body: unknown;
  log: Record<string, string | number | boolean>;
}

const SITE = 'site';
const fail = (status: number, error: string, retryAfter?: number, log: Outcome['log'] = {}): Outcome => ({
  status,
  body: retryAfter ? { error, retry_after: retryAfter } : { error },
  log: { ...log, error },
});

/** A request from this site: its own origin, a site hostname over https, or localhost in fixture mode. */
export function sameSite(origin: string | null, requestUrl: string, fixtures: boolean): boolean {
  if (!origin) return false;
  if (origin === new URL(requestUrl).origin) return true;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol === 'https:' && (SITE_HOSTNAMES.includes(url.hostname) || PREVIEW_HOSTNAME.test(url.hostname))) return true;
  return fixtures && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

/** The body as JSON, or null if it is too big or not JSON. */
async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > BODY_MAX_BYTES) return null;
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > BODY_MAX_BYTES) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

async function session(request: Request, ip: string, deps: Deps): Promise<boolean> {
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return false;
  const ipHash = await sessionIpHash(ip, deps.secrets.salt);
  return (await verifySession(token, deps.secrets.session, ipHash, deps.now())) !== null;
}

export function status(enabled: boolean): Outcome {
  return { status: 200, body: { enabled, limits: { question_chars: QUESTION_MAX_CHARS } }, log: {} };
}

/** POST /api/chat/session: a Turnstile token buys a signed session for SESSION_MINUTES. */
export async function createSession(request: Request, ip: string, deps: Deps): Promise<Outcome> {
  if (!sameSite(request.headers.get('origin'), request.url, deps.fixtures)) return fail(403, 'origin');
  const body = (await readJson(request)) as { turnstile_token?: unknown } | null;
  const token = typeof body?.turnstile_token === 'string' ? body.turnstile_token : '';
  if (!token) return fail(400, 'input');
  let ok: boolean;
  try {
    ok = await verifyTurnstile(token, deps.secrets.turnstile, ip, deps.fixtures, deps.fetcher);
  } catch {
    return fail(503, 'unavailable');
  }
  if (!ok) return fail(403, 'turnstile');
  const expires = deps.now() + SESSION_MINUTES * 60_000;
  const signed = await signSession({ id: randomId(), exp: expires, ip: await sessionIpHash(ip, deps.secrets.salt) }, deps.secrets.session);
  return { status: 200, body: { session: signed, expires_at: new Date(expires).toISOString() }, log: {} };
}

/** POST /api/chat/feedback: adds one to a count. */
export async function feedback(request: Request, ip: string, deps: Deps): Promise<Outcome> {
  if (!(await session(request, ip, deps))) return fail(401, 'session');
  if (!sameSite(request.headers.get('origin'), request.url, deps.fixtures)) return fail(403, 'origin');
  const input = checkFeedback(await readJson(request));
  if (!input) return fail(400, 'input');
  try {
    await deps.store.feedback(deps.index.version, utcDay(deps.now()), input.rating, input.kind);
  } catch {
    return fail(503, 'unavailable');
  }
  return { status: 200, body: { ok: true }, log: {} };
}

/** POST /api/chat: the checks in order, then the cache, the search, the model, and the checked reply. */
export async function chat(request: Request, ip: string, deps: Deps): Promise<Outcome> {
  const now = deps.now();
  const day = utcDay(now);
  const month = utcMonth(now);
  if (!(await session(request, ip, deps))) return fail(401, 'session');
  if (!sameSite(request.headers.get('origin'), request.url, deps.fixtures)) return fail(403, 'origin');
  const input = checkChatInput(await readJson(request));
  if (!input) return fail(400, 'input');

  const log: Outcome['log'] = {};
  try {
    const ipKey = await dailyIpHash(ip, day, deps.secrets.salt);
    if (!(await deps.limiter.limit({ key: ipKey })).success) return fail(429, 'slow_down', 60);
    const used = await deps.store.add('ip-day', ipKey, day);
    if (used > PER_IP_PER_DAY) return fail(429, 'daily_limit', secondsToMidnight(now));
    if ((await deps.store.get('neurons-day', SITE, day)) >= NEURONS_PER_DAY) return fail(429, 'site_busy', secondsToMidnight(now));
    if ((await deps.store.add('site-day', SITE, day)) > SITE_PER_DAY) return fail(429, 'site_busy', secondsToMidnight(now));
    const remaining = { today: Math.max(0, PER_IP_PER_DAY - used) };
    const done = (reply: ChatReply, extra: Outcome['log'] = {}): Outcome => ({
      status: 200,
      body: { ...reply, remaining },
      log: { ...log, ...extra, kind: reply.kind },
    });

    const query = expandQuestion(input.message, deps.glossary);
    const cacheable = input.history.length === 0;
    const cacheKey = cacheable ? await sha256(`${input.message.toLowerCase()}|${input.locale}|${deps.index.version}`) : '';
    if (cacheable) {
      const hit = await deps.store.cacheGet(cacheKey, deps.index.version, now - CACHE_DAYS * 86_400_000);
      if (hit) return done(JSON.parse(hit) as ChatReply, { cache: true });
    }

    let type: SearchType;
    if ((await deps.store.get('semantic-month', SITE, month)) < SEMANTIC_PER_MONTH) {
      type = 'hybrid';
      await deps.store.add('semantic-month', SITE, month);
    } else if ((await deps.store.get('keyword-month', SITE, month)) < KEYWORD_PER_MONTH) {
      type = 'keyword';
      await deps.store.add('keyword-month', SITE, month);
    } else {
      return fail(429, 'monthly_limit', secondsToMonthEnd(now), log);
    }
    log.search = type;
    const t0 = Date.now();
    const found = await deps.search.search(query, type);
    log.search_ms = Date.now() - t0;
    const passages = found
      .filter((p) => deps.index.documents[p.key] !== undefined && p.score >= SCORE_THRESHOLD)
      .slice(0, MAX_PASSAGES);
    log.passages = passages.length;
    if (!passages.length) return done(notFound());

    const labelled = passages.map((p, i) => {
      const e = deps.index.documents[p.key];
      return { label: `S${i + 1}`, kind: e.kind, title: e.title, text: p.text };
    });
    const t1 = Date.now();
    const out = await deps.model.run(buildMessages(labelled, input.history, input.message));
    log.model_ms = Date.now() - t1;
    log.tokens_in = out.inputTokens;
    log.tokens_out = out.outputTokens;
    if (NEURON_RATES[deps.model.name] && (out.inputTokens || out.outputTokens)) {
      await deps.store.add('neurons-day', SITE, day, neurons(deps.model.name, out.inputTokens, out.outputTokens));
    }

    const reply = buildReply(out.text, passages.map((p) => p.key), deps.index.documents);
    if (cacheable && reply.kind === 'answer') await deps.store.cachePut(cacheKey, deps.index.version, JSON.stringify(reply), now);
    return done(reply);
  } catch {
    return fail(503, 'unavailable', undefined, log);
  }
}
