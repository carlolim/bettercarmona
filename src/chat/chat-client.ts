/**
 * The chat API (worker/, docs/chatbot.md): the status check, sessions bought with a Turnstile token, questions,
 * and feedback. Nothing is stored in the browser: the session lives in memory and ends with the page.
 */
import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from '../config';
import { ERROR_CODES, type ErrorCode } from './codes';

export { ERROR_CODES, type ErrorCode };

export type ReplyKind = 'answer' | 'clarify' | 'not_found' | 'out_of_scope';

export interface Source {
  n: number;
  title: string;
  kind: string;
  site_url?: string;
  source_url?: string;
  source_label: string;
  date: string | null;
}

export interface ChatReply {
  kind: ReplyKind;
  text: string;
  featured: { title: string; kind: string; site_url: string } | null;
  sources: Source[];
  notices: string[];
  links?: { label: 'hotlines' | 'official_site'; site_url?: string; source_url?: string }[];
  remaining?: { today: number };
}

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatError extends Error {
  code: ErrorCode;
  retryAfter?: number;

  constructor(code: ErrorCode, retryAfter?: number) {
    super(code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/** The site key: Cloudflare's always-pass test key in development, the real one when built. */
export const siteKey = () => (import.meta.env.DEV || !TURNSTILE_SITE_KEY ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY);

/** True when the API says the assistant is on. Any failure counts as off. */
export async function chatEnabled(): Promise<boolean> {
  try {
    const res = await fetch('/api/chat/status', { headers: { accept: 'application/json' } });
    if (!res.ok) return false;
    const body = (await res.json()) as { enabled?: unknown };
    return body.enabled === true;
  } catch {
    return false;
  }
}

async function post<T>(path: string, body: unknown, session?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(session ? { authorization: `Bearer ${session}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ChatError('network');
  }
  const out = (await res.json().catch(() => ({}))) as { error?: string; retry_after?: number };
  if (!res.ok) {
    const code = ERROR_CODES.includes(out.error as ErrorCode) ? (out.error as ErrorCode) : 'unavailable';
    throw new ChatError(code, out.retry_after);
  }
  return out as T;
}

/**
 * Holds the session and gets a new one when it runs out. `getToken` asks the Turnstile widget for a fresh
 * token, since each token works once.
 */
export class ChatClient {
  private session: { token: string; expires: number } | null = null;
  private getToken: () => Promise<string>;

  constructor(getToken: () => Promise<string>) {
    this.getToken = getToken;
  }

  private async ensureSession(): Promise<string> {
    if (this.session && this.session.expires > Date.now() + 30_000) return this.session.token;
    const token = await this.getToken();
    const s = await post<{ session: string; expires_at: string }>('/api/chat/session', { turnstile_token: token });
    this.session = { token: s.session, expires: Date.parse(s.expires_at) };
    return s.session;
  }

  /** Asks a question. On an expired or refused session, gets a new one and tries once more. */
  async ask(message: string, history: Turn[], locale: 'en' | 'fil'): Promise<ChatReply> {
    const body = { message, history: history.slice(-6), locale };
    try {
      return await post<ChatReply>('/api/chat', body, await this.ensureSession());
    } catch (err) {
      if (!(err instanceof ChatError) || err.code !== 'session') throw err;
      this.session = null;
      return post<ChatReply>('/api/chat', body, await this.ensureSession());
    }
  }

  /** Thumbs up or down for one reply. A failure is ignored: feedback is never worth an error message. */
  async feedback(rating: 'up' | 'down', kind: ReplyKind): Promise<void> {
    if (!this.session) return;
    await post('/api/chat/feedback', { rating, kind }, this.session.token).catch(() => undefined);
  }
}
