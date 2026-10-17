import { describe, expect, it } from 'vitest';
import { makeId } from './ids';

describe('makeId', () => {
  it('prefixes and produces unique values', () => {
    const a = makeId('ALT');
    const b = makeId('ALT');
    expect(a.startsWith('ALT-')).toBe(true);
    expect(b.startsWith('ALT-')).toBe(true);
    expect(a).not.toBe(b);
  });
});
