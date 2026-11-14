/**
 * Turnstile, Cloudflare's check that a visitor is a person. A token is valid for 300 seconds and
 * works once, so it buys a session rather than a single answer.
 */
import { PREVIEW_HOSTNAME, SITE_HOSTNAMES } from './config.ts';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare's test secrets answer with this hostname. Accepted only in local work. */
const TEST_HOSTNAME = 'example.com';
/** Cloudflare's published test secret keys (1x, 2x, 3x...AA). They accept only the dummy token, never a real one. */
const TEST_SECRET = /^[123]x0{31}AA$/;

/** True for one of Cloudflare's test secrets, which only local work uses. */
export const isTestSecret = (secret: string) => TEST_SECRET.test(secret);

export function allowedHostname(hostname: string | undefined, local: boolean): boolean {
  if (!hostname) return false;
  if (SITE_HOSTNAMES.includes(hostname) || PREVIEW_HOSTNAME.test(hostname)) return true;
  return local && (hostname === TEST_HOSTNAME || hostname === 'localhost');
}

/** True only when Siteverify accepts the token and it was solved on this site (or, in local work, a test host). */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string,
  local: boolean,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetcher(SITEVERIFY, { method: 'POST', body: form });
  if (!res.ok) return false;
  const out = (await res.json()) as { success?: boolean; hostname?: string };
  return out.success === true && allowedHostname(out.hostname, local);
}
