/**
 * Stateless, signed session tokens for shipper + carrier auth.
 *
 * Comparable to rjs-platform `lib/session.ts`: a compact, HMAC-signed token
 * carried in an httpOnly cookie. No shared session store — the signature is
 * self-verifying, so any node in the fleet can validate a request. Secrets
 * come from the environment (`SESSION_SECRET`); rotation is supported by
 * accepting a list of secrets on verify.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserRole } from './types.ts';

export interface SessionClaims {
  /** Account id (shipper or carrier). */
  sub: string;
  role: UserRole;
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
}

export const SESSION_COOKIE = 'endr_session';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

export interface CreateSessionOptions {
  ttlSeconds?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

/**
 * Mint a signed session token for a shipper or carrier.
 */
export function createSession(
  sub: string,
  role: UserRole,
  secret: string,
  opts: CreateSessionOptions = {},
): string {
  if (!secret) throw new Error('createSession: secret is required');
  const now = Math.floor((opts.now?.() ?? Date.now()) / 1000);
  const claims: SessionClaims = {
    sub,
    role,
    iat: now,
    exp: now + (opts.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };
  const payload = b64url(JSON.stringify(claims));
  return `${payload}.${sign(payload, secret)}`;
}

export type VerifyResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/**
 * Verify a session token against one or more secrets (secret rotation).
 * Uses a constant-time signature comparison to avoid timing oracles.
 */
export function verifySession(
  token: string | undefined | null,
  secretOrSecrets: string | string[],
  opts: { now?: () => number } = {},
): VerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const [payload, signature] = token.split('.', 2);
  if (!payload || !signature) return { ok: false, reason: 'malformed' };

  const secrets = Array.isArray(secretOrSecrets) ? secretOrSecrets : [secretOrSecrets];
  const provided = b64urlDecode(signature);
  const matches = secrets.some((secret) => {
    const expected = b64urlDecode(sign(payload, secret));
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  });
  if (!matches) return { ok: false, reason: 'bad_signature' };

  let claims: SessionClaims;
  try {
    claims = JSON.parse(b64urlDecode(payload).toString('utf8')) as SessionClaims;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    typeof claims.sub !== 'string' ||
    (claims.role !== 'shipper' && claims.role !== 'carrier') ||
    typeof claims.exp !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }

  const now = Math.floor((opts.now?.() ?? Date.now()) / 1000);
  if (claims.exp <= now) return { ok: false, reason: 'expired' };

  return { ok: true, claims };
}

/** Serialize the session cookie with production-safe attributes. */
export function serializeSessionCookie(
  token: string,
  opts: { maxAgeSeconds?: number; secure?: boolean } = {},
): string {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${opts.maxAgeSeconds ?? DEFAULT_TTL_SECONDS}`,
  ];
  if (opts.secure ?? true) attrs.push('Secure');
  return attrs.join('; ');
}

/** A cookie header value that immediately clears the session. */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Pull the raw session token out of a Cookie header. */
export function readSessionCookie(cookieHeader: string | undefined | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return undefined;
}
