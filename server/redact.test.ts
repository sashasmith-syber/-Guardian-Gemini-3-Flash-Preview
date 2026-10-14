import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { redact } from './redact.ts';

describe('redact', () => {
  it('removes configured secrets and known token shapes', () => {
    const secret = 'super-secret-value';
    const text = `failed for ${secret} and AIzaSyA1234567890abcdef and sk-abcdefghijklmnopqrstuvwxyz`;
    const cleaned = redact(text, [secret]);
    assert.equal(cleaned.includes(secret), false);
    assert.equal(cleaned.includes('AIza'), false);
    assert.equal(cleaned.includes('sk-abc'), false);
    assert.match(cleaned, /\[redacted\]/);
  });

  it('redacts a longer secret before a shorter overlapping one', () => {
    const cleaned = redact('prefix-token-value', ['token', 'prefix-token-value']);
    assert.equal(cleaned, '[redacted]');
  });
});
