/** The error codes the chat API returns, and two of the panel's own. Kept apart so tests can read it without Vite. */
export const ERROR_CODES = [
  'session', 'origin', 'input', 'slow_down', 'daily_limit', 'site_busy', 'monthly_limit', 'unavailable', 'disabled',
  'turnstile', 'network',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
