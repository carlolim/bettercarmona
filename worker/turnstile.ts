/**
 * Turnstile, Cloudflare's check that a visitor is a person. A token is valid for 300 seconds and
 * works once, so it buys a session rather than a single answer.
 */
import { PREVIEW_HOSTNAME, SITE_HOSTNAMES } from './config.ts';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare's test secrets answer with this hostname. Accepted only in fixture mode. */
const TEST_HOSTNAME = 'example.com';

export function allowedHostname(hostname: string | undefined, fixtures: boolean): boolean {
  if (!hostname) return false;
  if (SITE_HOSTNAMES.includes(hostname) || PREVIEW_HOSTNAME.test(hostname)) return true;
  return fixtures && (hostname === TEST_HOSTNAME || hostname === 'localhost');
}

/** True only when Siteverify accepts the token and it was solved on this site. */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string,
  fixtures: boolean,
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
  return out.success === true && allowedHostname(out.hostname, fixtures);
}
