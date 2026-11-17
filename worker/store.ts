/**
 * Counters, the answer cache, and feedback counts, in D1. Behind an interface so tests can use an
 * in-memory copy.
 */

export type Scope = 'ip-day' | 'site-day' | 'semantic-month' | 'keyword-month' | 'neurons-day';

export interface Store {
  /** Adds `by` to a counter and returns the new count. */
  add(scope: Scope, key: string, period: string, by?: number): Promise<number>;
  get(scope: Scope, key: string, period: string): Promise<number>;
  cacheGet(hash: string, kbVersion: string, notBefore: number): Promise<string | null>;
  cachePut(hash: string, kbVersion: string, response: string, now: number): Promise<void>;
  feedback(kbVersion: string, day: string, rating: string, kind: string): Promise<void>;
}

export class D1Store implements Store {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async add(scope: Scope, key: string, period: string, by = 1): Promise<number> {
    const row = await this.db
      .prepare(
        `INSERT INTO counters (scope, key, period, count) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (scope, key, period) DO UPDATE SET count = count + ?4 RETURNING count`,
      )
      .bind(scope, key, period, by)
      .first<{ count: number }>();
    return row?.count ?? by;
  }

  async get(scope: Scope, key: string, period: string): Promise<number> {
    const row = await this.db
      .prepare('SELECT count FROM counters WHERE scope = ?1 AND key = ?2 AND period = ?3')
      .bind(scope, key, period)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async cacheGet(hash: string, kbVersion: string, notBefore: number): Promise<string | null> {
    const row = await this.db
      .prepare('SELECT response FROM answer_cache WHERE hash = ?1 AND kb_version = ?2 AND created_at >= ?3')
      .bind(hash, kbVersion, notBefore)
      .first<{ response: string }>();
    return row?.response ?? null;
  }

  async cachePut(hash: string, kbVersion: string, response: string, now: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO answer_cache (hash, kb_version, response, created_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (hash) DO UPDATE SET kb_version = ?2, response = ?3, created_at = ?4`,
      )
      .bind(hash, kbVersion, response, now)
      .run();
  }

  async feedback(kbVersion: string, day: string, rating: string, kind: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO feedback (kb_version, day, rating, kind, count) VALUES (?1, ?2, ?3, ?4, 1)
         ON CONFLICT (kb_version, day, rating, kind) DO UPDATE SET count = count + 1`,
      )
      .bind(kbVersion, day, rating, kind)
      .run();
  }
}

/** The same store in memory, for tests and fixtures. */
export class MemoryStore implements Store {
  counters = new Map<string, number>();
  cache = new Map<string, { kbVersion: string; response: string; createdAt: number }>();
  feedbackCounts = new Map<string, number>();

  async add(scope: Scope, key: string, period: string, by = 1): Promise<number> {
    const k = `${scope}|${key}|${period}`;
    const n = (this.counters.get(k) ?? 0) + by;
    this.counters.set(k, n);
    return n;
  }

  async get(scope: Scope, key: string, period: string): Promise<number> {
    return this.counters.get(`${scope}|${key}|${period}`) ?? 0;
  }

  async cacheGet(hash: string, kbVersion: string, notBefore: number): Promise<string | null> {
    const row = this.cache.get(hash);
    return row && row.kbVersion === kbVersion && row.createdAt >= notBefore ? row.response : null;
  }

  async cachePut(hash: string, kbVersion: string, response: string, now: number): Promise<void> {
    this.cache.set(hash, { kbVersion, response, createdAt: now });
  }

  async feedback(kbVersion: string, day: string, rating: string, kind: string): Promise<void> {
    const k = `${kbVersion}|${day}|${rating}|${kind}`;
    this.feedbackCounts.set(k, (this.feedbackCounts.get(k) ?? 0) + 1);
  }
}

/** The UTC date, YYYY-MM-DD. Cloudflare's daily allowances reset at 00:00 UTC. */
export const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);
/** The UTC month, YYYY-MM. */
export const utcMonth = (now: number) => new Date(now).toISOString().slice(0, 7);
/** Seconds until the next 00:00 UTC. */
export const secondsToMidnight = (now: number) => Math.ceil((Date.UTC(...ymd(now)) + 86_400_000 - now) / 1000);
/** Seconds until the first day of next month, 00:00 UTC. */
export const secondsToMonthEnd = (now: number) => {
  const d = new Date(now);
  return Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - now) / 1000);
};

function ymd(now: number): [number, number, number] {
  const d = new Date(now);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}
