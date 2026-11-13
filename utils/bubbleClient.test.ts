import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { imagePayload } from './bubbleClient.ts';

const png = 'data:image/png;base64,AAAA';

describe('imagePayload', () => {
  it('accepts the same still-image types the bubble allows', () => {
    assert.deepEqual(imagePayload(png), { mimeType: 'image/png', data: 'AAAA' });
    assert.deepEqual(imagePayload('data:image/jpeg;base64,AAAA'), { mimeType: 'image/jpeg', data: 'AAAA' });
    assert.deepEqual(imagePayload('data:IMAGE/WEBP;base64,AAAA'), { mimeType: 'image/webp', data: 'AAAA' });
    assert.deepEqual(imagePayload('data:image/gif;base64,AAAA'), { mimeType: 'image/gif', data: 'AAAA' });
  });

  it('rejects svg, scripts, and malformed payloads', () => {
    assert.equal(imagePayload('data:image/svg+xml;base64,AAAA'), undefined);
    assert.equal(imagePayload('javascript:alert(1)'), undefined);
    assert.equal(imagePayload('data:image/png;base64,@@@'), undefined);
    assert.equal(imagePayload(undefined), undefined);
  });
});
