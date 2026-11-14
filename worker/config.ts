/**
 * The chat API's settings. Each limit sits below the Cloudflare free allowance it protects, so the
 * assistant stops answering before anything could be billed. See docs/chatbot.md.
 */

/** The AI Search instance, in the namespace bound as KB in wrangler.jsonc. kb:sync uploads to it. */
export const KB_INSTANCE = 'bettercarmona-kb';

/** The placeholder model. Task 026 chooses the real one. */
export const MODEL = '@cf/google/gemma-4-26b-a4b-it';

/**
 * Neurons per million tokens, from the Workers AI pricing page, read 2026-11-13. Used to count the
 * day's Neurons from the token usage each reply reports.
 */
export const NEURON_RATES: Record<string, { input: number; output: number }> = {
  '@cf/google/gemma-4-26b-a4b-it': { input: 9091, output: 27273 },
  '@cf/qwen/qwen3-30b-a3b-fp8': { input: 4625, output: 30475 },
  '@cf/meta/llama-4-scout-17b-16e-instruct': { input: 24545, output: 77273 },
  '@cf/openai/gpt-oss-120b': { input: 31818, output: 68182 },
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { input: 26668, output: 204805 },
};

/** Longest question, in characters. Keeps each call small and each search cheap. */
export const QUESTION_MAX_CHARS = 500;
/** Earlier messages sent with a question. Keeps the model's input, and so its Neurons, small. */
export const HISTORY_MAX_ITEMS = 6;
/** Longest earlier message, in characters. */
export const HISTORY_ITEM_MAX_CHARS = 500;
/** Largest request body. Anything bigger is refused before it is parsed, to save CPU time (10 ms per request). */
export const BODY_MAX_BYTES = 8 * 1024;

/** Longest answer, in tokens: about 120 words. Protects Workers AI's 10,000 Neurons a day. */
export const MAX_OUTPUT_TOKENS = 400;
/** Low, so answers stay close to the sources. */
export const TEMPERATURE = 0.2;

/** Questions per IP per minute, through the rate limiting binding. Its period must be 10 or 60 seconds. Also set in wrangler.jsonc. */
export const PER_IP_PER_MINUTE = 5;
/** Questions per IP per day, counted in D1. */
export const PER_IP_PER_DAY = 20;
/** Questions answered per day for the whole site. With about 32 Neurons an answer, 40 stays far under 10,000 Neurons. */
export const SITE_PER_DAY = 40;
/** Neurons per day. The free allowance is 10,000. Past this, the assistant rests until 00:00 UTC. */
export const NEURONS_PER_DAY = 8000;
/** AI Search semantic (hybrid) queries per month. The free allowance is 1,000. */
export const SEMANTIC_PER_MONTH = 900;
/** AI Search keyword queries per month, used once the semantic ones run out. The free allowance is 1,000. */
export const KEYWORD_PER_MONTH = 900;

/** Passages sent to the model, labelled S1 to S6. */
export const MAX_PASSAGES = 6;
/** Longest passage sent to the model, in characters. */
export const PASSAGE_MAX_CHARS = 2500;
/**
 * Passages scoring below this are dropped. When none is left, the reply is "not found", with no model call.
 * The score is the instance's reranker's, which scores Tagalog and Taglish far lower than English: the
 * right ordinance came first at 0.01 to 0.36 for Taglish questions, while English matches score 0.85 and
 * up. On the test set (2026-11-14, starter questions), 0.1 kept the expected document for 8 of 8 Tagalog
 * and 12 of 13 Taglish questions, and no passage for any question that should be refused.
 */
export const SCORE_THRESHOLD = 0.1;

/** How long a session lasts. A Turnstile token works once, so later messages carry the session instead. */
export const SESSION_MINUTES = 30;
/** How long a cached answer is kept, in days, for the same index version. */
export const CACHE_DAYS = 30;

/** The site's hostnames. Requests must come from one of them, and Turnstile must have been solved on one. */
export const SITE_HOSTNAMES = ['bettercarmona.org', 'www.bettercarmona.org'];
/** The Worker's own workers.dev address, used for the preview before launch. */
export const PREVIEW_HOSTNAME = /^bettercarmona\.[a-z0-9-]+\.workers\.dev$/;

/** Shown when the documents do not cover a question. */
export const OFFICIAL_SITE_URL = 'https://carmonagov.net/portal/';
