import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clearSessionCookie, createSessionCookie, hasValidSession } from './auth.ts';

const PASSWORD = 'a-long-random-operator-password-123456789';

describe('operator session', () => {
  it('creates a short-lived HttpOnly cookie only for the configured password', () => {
    const cookie = createSessionCookie(PASSWORD, PASSWORD, 1_700_000_000_000);
    assert.ok(cookie);
    assert.match(cookie, /^guardian_session=.*; Path=\/; HttpOnly; SameSite=Strict; Max-Age=28800; Secure$/);
    assert.equal(createSessionCookie('wrong', PASSWORD), undefined);
    assert.equal(createSessionCookie(PASSWORD, 'short'), undefined);
  });

  it('validates signatures, rejects tampering and expires sessions', () => {
    const now = 1_700_000_000_000;
    const cookie = createSessionCookie(PASSWORD, PASSWORD, now)!;
    assert.equal(hasValidSession(cookie, PASSWORD, now), true);
    const tampered = cookie.replace(/[A-Za-z0-9_-]{43}/, (value) => `${value[0] === 'A' ? 'B' : 'A'}${value.slice(1)}`);
    assert.equal(hasValidSession(tampered, PASSWORD, now), false);
    assert.equal(hasValidSession(cookie, PASSWORD, now + 8 * 60 * 60 * 1000), false);
    assert.equal(hasValidSession(`${cookie}; ${cookie}`, PASSWORD, now), false);
    assert.equal(hasValidSession(cookie, 'different-password-with-more-than-32-bytes', now), false);
  });

  it('clears the same host-only cookie', () => {
    assert.equal(
      clearSessionCookie(false),
      'guardian_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    );
  });
});
