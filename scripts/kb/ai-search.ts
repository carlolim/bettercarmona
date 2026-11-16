/**
 * A small client for Cloudflare AI Search's REST API, for kb:sync and kb:update. Reads its settings
 * from the environment or .env, and never prints the token.
 *
 * What the live service showed on 2026-11-14 (see docs/chatbot.md):
 * - An item's key is the uploaded file name, folders included: "ordinances/514.md" stays as it is.
 * - Uploading the same name again replaces the item, keeping its id.
 * - The item's `checksum` is always "0", so kb:sync keeps its own hashes in knowledge/sources/synced.json.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { ROOT } from './manifest.ts';

export interface Settings {
  accountId: string;
  token: string;
  instance: string;
  namespace: string;
}

export interface Item {
  id: string;
  key: string;
  status: string;
  error?: string | null;
}

export interface Chunk {
  score: number;
  text: string;
  item: { key: string };
}

export class AuthError extends Error {}

/**
 * KB_ACCOUNT_ID, KB_API_TOKEN, KB_INSTANCE, and KB_NAMESPACE, from the environment or .env. Not the
 * CLOUDFLARE_* names: Wrangler reads those from .env too, and would use this AI Search-only token
 * instead of the user's login, which breaks `wrangler dev` and `wrangler deploy`.
 */
export function loadSettings(): Settings {
  const file = join(ROOT, '.env');
  const fromFile: Record<string, string> = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m) fromFile[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  const get = (name: string) => process.env[name] ?? fromFile[name] ?? '';
  const settings = {
    accountId: get('KB_ACCOUNT_ID'),
    token: get('KB_API_TOKEN'),
    instance: get('KB_INSTANCE'),
    namespace: get('KB_NAMESPACE') || 'default',
  };
  const missing = Object.entries({ KB_ACCOUNT_ID: settings.accountId, KB_API_TOKEN: settings.token, KB_INSTANCE: settings.instance })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (!missing.length) return settings;
  const old = get('CLOUDFLARE_API_TOKEN') ? ' Rename CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env to KB_ACCOUNT_ID and KB_API_TOKEN.' : '';
  throw new AuthError(`${missing.join(', ')} not set. Put them in .env, as .env.example shows.${old}`);
}

const GAP_MS = 250;
const RETRIES = 5;

export class AiSearchClient {
  private s: Settings;
  private last = 0;

  constructor(settings: Settings) {
    this.s = settings;
  }

  private get base() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.s.accountId}/ai-search/namespaces/${this.s.namespace}/instances/${this.s.instance}`;
  }

  /** One call, at least GAP_MS after the last, retried with a growing wait on a rate limit or server error. */
  private async call<T>(method: string, path: string, body?: BodyInit, json = false, envelope = false): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const wait = this.last + GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
      const res = await fetch(`${this.base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.s.token}`, ...(json ? { 'content-type': 'application/json' } : {}) },
        body,
      });
      if (res.status === 401 || res.status === 403) {
        throw new AuthError(`Cloudflare refused the token (HTTP ${res.status}). It needs AI Search Edit and AI Search Run on this account.`);
      }
      if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
        const after = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 2000 * 2 ** attempt);
        continue;
      }
      const out = (await res.json().catch(() => ({}))) as { success?: boolean; result?: T; errors?: { message?: string }[] };
      if (envelope && res.ok && out.success !== false) return out as T;
      if (!res.ok || out.success === false) {
        const message = (out.errors ?? []).map((e) => e.message).join('; ') || `HTTP ${res.status}`;
        if (message.includes('ai_search_not_found')) {
          throw new AuthError(`No instance "${this.s.instance}" in namespace "${this.s.namespace}". Check KB_INSTANCE and KB_NAMESPACE.`);
        }
        throw new Error(`${method} ${path.split('?')[0]}: ${message}`);
      }
      return out.result as T;
    }
  }

  /**
   * Every item in the instance. Pages can shift while items are indexing, so items are listed by
   * modification time, de-duplicated, and listed again until the count matches the instance's total.
   */
  async list(): Promise<Item[]> {
    for (let attempt = 0; ; attempt++) {
      const byId = new Map<string, Item>();
      let total: number;
      for (let page = 1; ; page++) {
        const { result, result_info } = await this.call<{ result: Item[]; result_info?: { total_count?: number } }>(
          'GET',
          `/items?per_page=50&page=${page}&sort_by=modified_at`,
          undefined,
          false,
          true,
        );
        for (const i of result) byId.set(i.id, i);
        total = result_info?.total_count ?? byId.size;
        if (result.length < 50) break;
      }
      if (byId.size === total || attempt >= 3) return [...byId.values()];
      await sleep(3000);
    }
  }

  /** Uploads a document under `key`, replacing any item with that key. */
  async upload(key: string, text: string): Promise<Item> {
    const form = new FormData();
    form.append('file', new Blob([text], { type: 'text/markdown' }), key);
    return this.call<Item>('POST', '/items', form);
  }

  async remove(id: string): Promise<void> {
    await this.call('DELETE', `/items/${id}`);
  }

  /** Runs a Workers AI model through the REST API. The output has the same shape as the Worker's binding. */
  async run(model: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.s.accountId}/ai/run/${model}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${this.s.token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (res.status === 401 || res.status === 403) throw new AuthError(`Cloudflare refused the token for Workers AI (HTTP ${res.status}). It needs Workers AI Read.`);
      if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      const out = (await res.json().catch(() => ({}))) as { success?: boolean; result?: Record<string, unknown>; errors?: { message?: string }[] };
      if (!res.ok || out.success === false) throw new Error(`${model}: ${(out.errors ?? []).map((e) => e.message).join('; ') || `HTTP ${res.status}`}`);
      return out.result ?? {};
    }
  }

  /** `reranking` overrides the instance's reranking, which drops results under its own threshold (0.4 by default). */
  async search(query: string, retrieval: Record<string, unknown> = {}, reranking?: Record<string, unknown>): Promise<Chunk[]> {
    const body = JSON.stringify({
      query,
      ai_search_options: {
        retrieval: { retrieval_type: 'hybrid', keyword_match_mode: 'or', ...retrieval },
        query_rewrite: { enabled: false },
        ...(reranking ? { reranking } : {}),
      },
    });
    return (await this.call<{ chunks: Chunk[] }>('POST', '/search', body, true)).chunks;
  }
}
