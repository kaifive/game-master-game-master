import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Admin sessions (spec 06, ADR-028): a signed expiry in an HTTP-only cookie. */

export const SESSION_COOKIE = "gm_admin";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const digest = (s: string) => createHash("sha256").update(s).digest();
const key = (passphrase: string) => digest(`gm-admin-session:${passphrase}`);
const sign = (passphrase: string, expires: string) =>
  createHmac("sha256", key(passphrase)).update(expires).digest("base64url");

/** Whether a typed passphrase is the admin's. Constant-time, whatever the lengths (S06-AC1). */
export function passphraseMatches(input: string, expected: string): boolean {
  return timingSafeEqual(digest(input), digest(expected));
}

/** A session token: when it expires, and a signature keyed from the passphrase (S06-AC3). */
export function signSession(passphrase: string, now: number): string {
  const expires = String(now + SESSION_MS);
  return `${expires}.${sign(passphrase, expires)}`;
}

/** Valid only if unexpired and signed with the current passphrase (S06-AC3). */
export function verifySession(token: string | undefined, passphrase: string, now: number): boolean {
  if (!token) return false;
  const [expires, signature, extra] = token.split(".");
  if (!expires || !signature || extra !== undefined || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= now) return false;
  const expected = Buffer.from(sign(passphrase, expires));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Wrong passphrases per IP: after `max` within the window, locked for `lockMs` (S06-AC2). */
export class SignInLimiter {
  private readonly fails = new Map<string, { count: number; first: number; lockedUntil: number }>();

  constructor(
    private readonly max = 5,
    private readonly windowMs = 10 * 60 * 1000,
    private readonly lockMs = 10 * 60 * 1000,
  ) {}

  locked(ip: string, now: number): boolean {
    return (this.fails.get(ip)?.lockedUntil ?? 0) > now;
  }

  fail(ip: string, now: number) {
    const f = this.fails.get(ip);
    const fresh = !f || now - f.first > this.windowMs;
    const next = fresh ? { count: 1, first: now, lockedUntil: 0 } : { ...f, count: f.count + 1 };
    if (next.count >= this.max) next.lockedUntil = now + this.lockMs;
    this.fails.set(ip, next);
  }

  succeed(ip: string) {
    this.fails.delete(ip);
  }
}
