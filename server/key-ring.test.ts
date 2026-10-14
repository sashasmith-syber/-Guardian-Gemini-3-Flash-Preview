import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KeyRing } from './key-ring.ts';

const now = 1_700_000_000_000;

describe('key ring', () => {
  it('fails over to the next key and cools the rejected one', () => {
    const ring = new KeyRing({
      secrets: ['alpha-key', 'beta-key'],
      strategy: 'failover',
      cooldownMs: 1_000,
    });
    const first = ring.acquire(new Set(), now);
    assert.equal(first?.id, 'k1');
    ring.reportFailure('k1', now);
    const second = ring.acquire(new Set(), now);
    assert.equal(second?.id, 'k2');
    assert.equal(ring.coolingCount(now), 1);
    assert.equal(ring.acquire(new Set(), now + 1_000)?.id, 'k1');
  });

  it('round-robins across healthy keys', () => {
    const ring = new KeyRing({
      secrets: ['alpha-key', 'beta-key'],
      strategy: 'round-robin',
      cooldownMs: 1_000,
    });
    assert.equal(ring.acquire(new Set(), now)?.id, 'k1');
    assert.equal(ring.acquire(new Set(), now)?.id, 'k2');
    assert.equal(ring.acquire(new Set(), now)?.id, 'k1');
  });

  it('does not hand out a secret when every key is cooling', () => {
    const ring = new KeyRing({
      secrets: ['alpha-key'],
      strategy: 'failover',
      cooldownMs: 5_000,
    });
    ring.reportFailure('k1', now);
    assert.equal(ring.acquire(new Set(), now), null);
  });
});
