/**
 * The Worker. Static files and client-side routes are served by Cloudflare's asset handling and
 * never reach this code (wrangler.jsonc: run_worker_first ["/api/*"]). Only /api/* runs here.
 */
import kbIndex from '../.kb/kb-index.json' with { type: 'json' };
import glossary from '../.kb/glossary.json' with { type: 'json' };
import { chat, createSession, feedback, status, type Deps, type KbIndex, type Outcome } from './chat.ts';
import type { Env } from './env.ts';
import { FixtureModel, WorkersAiModel } from './model.ts';
import { AiSearch, FixtureSearch, type FixturePassage } from './search.ts';
import { D1Store } from './store.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Stands in for the per-minute binding where it isn't configured. */
const noLimit = { limit: async () => ({ success: true }) };

function deps(env: Env, fixturePassages: FixturePassage[]): Deps {
  const fixtures = env.CHAT_FIXTURES === '1';
  return {
    store: new D1Store(env.DB),
    search: fixtures ? new FixtureSearch(fixturePassages) : new AiSearch(env.KB),
    model: fixtures ? new FixtureModel() : new WorkersAiModel(env.AI),
    limiter: env.PER_MINUTE ?? noLimit,
    index: kbIndex as unknown as KbIndex,
    glossary: glossary as Record<string, string[]>,
    secrets: { session: env.SESSION_SECRET ?? '', salt: env.IP_HASH_SALT ?? '', turnstile: env.TURNSTILE_SECRET_KEY ?? '' },
    fixtures,
    now: () => Date.now(),
  };
}

type Route = (request: Request, ip: string, deps: Deps) => Promise<Outcome>;
const ROUTES: Record<string, { method: string; run: Route }> = {
  '/api/chat': { method: 'POST', run: chat },
  '/api/chat/session': { method: 'POST', run: createSession },
  '/api/chat/feedback': { method: 'POST', run: feedback },
};

/**
 * The Worker, given the fixture search's passages. Deployed, that list is empty: only worker/dev.ts,
 * the entry `npm run dev:api` uses, passes the documents, so they never ship with the Worker.
 */
export function makeWorker(fixturePassages: FixturePassage[] = []) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      const started = Date.now();
      const enabled = env.CHAT_ENABLED === 'true';
      let outcome: Outcome;
      if (url.pathname === '/api/chat/status' && request.method === 'GET') {
        outcome = status(enabled);
      } else if (!ROUTES[url.pathname]) {
        outcome = { status: 404, body: { error: 'not_found' }, log: { error: 'not_found' } };
      } else if (!enabled) {
        outcome = { status: 503, body: { error: 'disabled' }, log: { error: 'disabled' } };
      } else if (request.method !== ROUTES[url.pathname].method) {
        outcome = { status: 405, body: { error: 'method' }, log: { error: 'method' } };
      } else if (!env.SESSION_SECRET || !env.IP_HASH_SALT || !env.TURNSTILE_SECRET_KEY) {
        outcome = { status: 503, body: { error: 'unavailable' }, log: { error: 'secrets_missing' } };
      } else {
        try {
          const ip = request.headers.get('cf-connecting-ip') ?? '';
          outcome = await ROUTES[url.pathname].run(request, ip, deps(env, fixturePassages));
        } catch {
          outcome = { status: 503, body: { error: 'unavailable' }, log: { error: 'unavailable' } };
        }
      }
      // One line per request: route, status, code, timings, token counts. Never the message, the answer, or the IP.
      console.log(JSON.stringify({ route: url.pathname, status: outcome.status, ms: Date.now() - started, ...outcome.log }));
      return json(outcome.status, outcome.body);
    },
  } satisfies ExportedHandler<Env>;
}

export default makeWorker();
