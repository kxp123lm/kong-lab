import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signToken, readToken, hashIP, passwordMatches, isSameOrigin } from '../src/lib/security';
import { startSchema, syncSchema, filterSchema } from '../src/lib/validation';
process.env.SESSION_SECRET = 'test-only-secret-'.repeat(4);
process.env.IP_HMAC_SECRET = 'test-only-ip-secret-'.repeat(4);
process.env.ADMIN_PASSWORD = 'test-only-password';

test('signed tokens reject tampering, expiration, wrong purpose and wrong player', () => {
  const t = signToken({ kind: 'game', player: 'p1', sid: 's1' }, 60, 1000);
  assert.equal(readToken(t, 'game', 2000)?.player, 'p1');
  assert.equal(readToken(t + 'x', 'game', 2000), null);
  assert.equal(readToken(t, 'admin', 2000), null);
  assert.equal(readToken(t, 'game', 62000), null);
});
test('IP HMAC is deterministic, secret dependent and contains no plaintext address', () => {
  const h = hashIP('192.0.2.9');
  assert.equal(h.length, 64);
  assert.equal(hashIP('192.0.2.9'), h);
  assert.notEqual(hashIP('192.0.2.10'), h);
  assert.equal(h.includes('192.0.2.9'), false);
});
test('password comparison rejects wrong or empty password', () => {
  assert.equal(passwordMatches('test-only-password'), true);
  assert.equal(passwordMatches('test-only-password!'), false);
  assert.equal(passwordMatches(''), false);
});
test('mutating requests require exact same origin, including beacon requests', () => {
  assert.equal(isSameOrigin(new Request('https://lab.test/api/sync', { headers: { origin: 'https://lab.test' } })), true);
  assert.equal(isSameOrigin(new Request('https://lab.test/api/sync', { headers: { origin: 'https://evil.test' } })), false);
  assert.equal(isSameOrigin(new Request('https://lab.test/api/sync')), false);
});
test('validation rejects impersonation flags, HTML, fractional scores and invalid dates', () => {
  const startKey = '00000000-0000-4000-8000-000000000001';
  assert.equal(startSchema.safeParse({ startKey, nickname: '', isAdmin: true }).success, false);
  assert.equal(startSchema.safeParse({ startKey, nickname: '<script>' }).success, false);
  assert.equal(startSchema.safeParse({ startKey, nickname: '' }).success, true);
  assert.equal(syncSchema.safeParse({ token: 'x', score: 1.5, finished: false }).success, false);
  assert.equal(filterSchema.safeParse({ from: '2026-99-99' }).success, false);
});
