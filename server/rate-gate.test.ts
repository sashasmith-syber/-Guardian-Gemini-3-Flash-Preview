import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RateGate } from './rate-gate.ts';

describe('bounded rate gate', () => {
  it('removes expired clients and refuses new clients when its bounded map is full', () => {
    const gate = new RateGate(1, 1000, 2);
    assert.equal(gate.allow('one', 100), true);
    assert.equal(gate.allow('two', 100), true);
    assert.equal(gate.allow('three', 100), false);
    assert.equal(gate.clientCount, 2);
    assert.equal(gate.allow('three', 1200), true);
    assert.equal(gate.clientCount, 1);
  });

  it('bounds untrusted client identifiers', () => {
    const gate = new RateGate(1, 1000, 2);
    assert.equal(gate.allow('x'.repeat(1000), 100), true);
    assert.equal(gate.allow('x'.repeat(128) + 'attacker', 200), false);
    assert.equal(gate.clientCount, 1);
  });
});
