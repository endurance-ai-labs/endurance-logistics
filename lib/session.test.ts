import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  verifySession,
  serializeSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  SESSION_COOKIE,
} from './session.ts';

const SECRET = 'test-secret-please-rotate';
const fixedNow = () => 1_700_000_000_000; // ms

test('round-trips a shipper session', () => {
  const token = createSession('shp_1', 'shipper', SECRET, { now: fixedNow });
  const res = verifySession(token, SECRET, { now: fixedNow });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.claims.sub, 'shp_1');
    assert.equal(res.claims.role, 'shipper');
  }
});

test('rejects a tampered payload (bad signature)', () => {
  const token = createSession('car_1', 'carrier', SECRET, { now: fixedNow });
  const [, sig] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ sub: 'car_evil', role: 'carrier', iat: 1, exp: 9_999_999_999 }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const forged = `${forgedPayload}.${sig}`;
  const res = verifySession(forged, SECRET, { now: fixedNow });
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'bad_signature');
});

test('rejects expired tokens', () => {
  const token = createSession('shp_1', 'shipper', SECRET, { now: fixedNow, ttlSeconds: 10 });
  const later = () => fixedNow() + 20_000;
  const res = verifySession(token, SECRET, { now: later });
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'expired');
});

test('malformed tokens are rejected', () => {
  assert.equal(verifySession('', SECRET).ok, false);
  assert.equal(verifySession('nodot', SECRET).ok, false);
  assert.equal(verifySession(undefined, SECRET).ok, false);
});

test('supports secret rotation on verify', () => {
  const token = createSession('shp_1', 'shipper', 'old-secret', { now: fixedNow });
  const res = verifySession(token, ['new-secret', 'old-secret'], { now: fixedNow });
  assert.equal(res.ok, true);
});

test('cookie serialize/parse round-trips', () => {
  const token = createSession('shp_1', 'shipper', SECRET, { now: fixedNow });
  const header = serializeSessionCookie(token, { secure: true });
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
  const parsed = readSessionCookie(`other=1; ${SESSION_COOKIE}=${token}; more=2`);
  assert.equal(parsed, token);
});

test('clear cookie expires immediately', () => {
  assert.match(clearSessionCookie(), /Max-Age=0/);
});
