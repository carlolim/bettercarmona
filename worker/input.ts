/** Checks a chat request body. Anything unexpected is refused, before any binding is called. */
import { HISTORY_ITEM_MAX_CHARS, HISTORY_MAX_ITEMS, QUESTION_MAX_CHARS } from './config.ts';

export type Locale = 'en' | 'fil';

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatInput {
  message: string;
  history: Turn[];
  locale: Locale;
}

/** The checked input, or null if anything is wrong. */
export function checkChatInput(body: unknown): ChatInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { message, history = [], locale = 'en' } = body as Record<string, unknown>;
  if (typeof message !== 'string') return null;
  const text = message.trim();
  if (text.length < 1 || text.length > QUESTION_MAX_CHARS) return null;
  if (!Array.isArray(history) || history.length > HISTORY_MAX_ITEMS) return null;
  const turns: Turn[] = [];
  for (const t of history) {
    if (!t || typeof t !== 'object') return null;
    const { role, content } = t as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    if (content.length > HISTORY_ITEM_MAX_CHARS) return null;
    turns.push({ role, content });
  }
  if (locale !== 'en' && locale !== 'fil') return null;
  return { message: text, history: turns, locale };
}

export const RATINGS = ['up', 'down'] as const;
export const REPLY_KINDS = ['answer', 'clarify', 'not_found', 'out_of_scope'] as const;

export function checkFeedback(body: unknown): { rating: string; kind: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { rating, kind } = body as Record<string, unknown>;
  if (!RATINGS.includes(rating as never) || !REPLY_KINDS.includes(kind as never)) return null;
  return { rating: rating as string, kind: kind as string };
}
