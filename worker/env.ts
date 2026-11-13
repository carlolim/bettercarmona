/** The Worker's bindings and secrets, as set in wrangler.jsonc and the Cloudflare dashboard. */
export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  KB: AiSearchInstance;
  DB: D1Database;
  PER_MINUTE: RateLimit;
  /** The on switch, a dashboard secret. Anything but "true", or no value, is off. */
  CHAT_ENABLED?: string;
  /** "1" uses the fixture search and model. Only in .dev.vars, never in production. */
  CHAT_FIXTURES?: string;
  TURNSTILE_SECRET_KEY?: string;
  SESSION_SECRET?: string;
  IP_HASH_SALT?: string;
}
