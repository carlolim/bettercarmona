/**
 * Sessions and hashing. A session is a small payload (random id, expiry, a hash of the caller's IP)
 * signed with HMAC-SHA-256, so the Worker needs no storage to check it. IPs are only ever hashed.
 */

export interface SessionPayload {
  id: string;
  /** Expiry, in milliseconds since 1970. */
  exp: number;
  /** SHA-256 of the IP and the salt. */
  ip: string;
}

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The IP as the session carries it: hashed with the salt, never stored or logged. */
export const sessionIpHash = (ip: string, salt: string) => sha256(`session|${ip}|${salt}`);
/** The key for an IP's daily counter: the IP, the day, and the salt, hashed, so it can't be linked across days. */
export const dailyIpHash = (ip: string, day: string, salt: string) => sha256(`day|${ip}|${day}|${salt}`);

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

/** The payload, if the token is signed with this secret, unexpired, and issued to this IP hash. Otherwise null. */
export async function verifySession(token: string, secret: string, ipHash: string, now: number): Promise<SessionPayload | null> {
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined || token.length > 1024) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(sig), encoder.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp <= now || payload.ip !== ipHash) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}
