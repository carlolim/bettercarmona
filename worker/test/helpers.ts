/** Shared setup for the Worker's tests: real index and documents, fixtures for everything else. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, KB } from '../../scripts/kb/build.ts';
import type { Deps, KbIndex } from '../chat.ts';
import { FixtureModel, type Model } from '../model.ts';
import { FixtureSearch, type FixturePassage, type Passage, type Search, type SearchType } from '../search.ts';
import { signSession, sessionIpHash } from '../session.ts';
import { MemoryStore } from '../store.ts';

build();
export const INDEX = JSON.parse(readFileSync(join(KB, 'kb-index.json'), 'utf8')) as KbIndex;
export const GLOSSARY = JSON.parse(readFileSync(join(KB, 'glossary.json'), 'utf8')) as Record<string, string[]>;
export const PASSAGES = JSON.parse(readFileSync(join(KB, 'fixture-passages.json'), 'utf8')) as FixturePassage[];

export const IP = '203.0.113.7';
export const ORIGIN = 'https://bettercarmona.org';
export const NOW = Date.UTC(2026, 10, 13, 4, 0, 0);
export const SECRETS = { session: 'test-session-secret', salt: 'test-salt', turnstile: '1x0000000000000000000000000000000AA' };

/** Records each search, so tests can see which kind ran, or that none did. */
export class SpySearch implements Search {
  calls: SearchType[] = [];
  private inner: Search;

  constructor(inner: Search = new FixtureSearch(PASSAGES)) {
    this.inner = inner;
  }

  async search(query: string, type: SearchType): Promise<Passage[]> {
    this.calls.push(type);
    return this.inner.search(query, type);
  }
}

/** A per-minute limiter that allows `limit` calls per key. */
export function minuteLimiter(limit = 5) {
  const seen = new Map<string, number>();
  return {
    async limit({ key }: { key: string }) {
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      return { success: n <= limit };
    },
  };
}

export function makeDeps(over: Partial<Deps> = {}): Deps & { store: MemoryStore; search: SpySearch } {
  return {
    store: new MemoryStore(),
    search: new SpySearch(),
    model: new FixtureModel() as Model,
    limiter: minuteLimiter(),
    index: INDEX,
    glossary: GLOSSARY,
    secrets: SECRETS,
    local: true,
    now: () => NOW,
    ...over,
  } as Deps & { store: MemoryStore; search: SpySearch };
}

export async function sessionFor(ip = IP, exp = NOW + 30 * 60_000, secret = SECRETS.session): Promise<string> {
  return signSession({ id: 'test', exp, ip: await sessionIpHash(ip, SECRETS.salt) }, secret);
}

export function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export async function ask(deps: Deps, message: string, extra: Record<string, unknown> = {}, session?: string) {
  const { chat } = await import('../chat.ts');
  const token = session ?? (await sessionFor());
  return chat(post('/api/chat', { message, history: [], locale: 'en', ...extra }, { authorization: `Bearer ${token}` }), IP, deps);
}
