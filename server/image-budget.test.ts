import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rejectionMessage } from '../utils/bubbleClient.ts';
import {
  ATTACHMENT_TOO_LARGE,
  GENERATE_BODY_BUDGET,
  PLATFORM_BODY_LIMIT,
  base64LengthForBytes,
  envelopeBytes,
  fitImageBase64,
  imageTransportBytes,
} from '../utils/imageBudget.ts';

describe('image transport budget', () => {
  it('counts the generate JSON envelope', () => {
    const text = 'status check';
    const mime = 'image/jpeg';
    const data = 'AAAA';
    const encoded = JSON.stringify({ text, image: { mimeType: mime, data } });
    assert.equal(encoded.length, envelopeBytes(text.length, mime, data.length));
  });

  it('treats a 3.4 MB photo as larger than the platform drop', () => {
    const transport = imageTransportBytes('image/jpeg', base64LengthForBytes(3_400_000));
    assert.equal(transport > PLATFORM_BODY_LIMIT, true);
    assert.equal(transport > GENERATE_BODY_BUDGET, true);
  });

  it('keeps a small image and shrinks a camera photo under the budget', () => {
    let calls = 0;
    const small = fitImageBase64({ mimeType: 'image/png', data: 'AAAA' }, () => {
      calls += 1;
      return 'BBBB';
    });
    assert.equal(small.mimeType, 'image/png');
    assert.equal(small.data, 'AAAA');
    assert.equal(calls, 0);

    const fitted = fitImageBase64(
      { mimeType: 'image/jpeg', data: 'C'.repeat(base64LengthForBytes(3_400_000)) },
      (edge, quality) => {
        const raw = Math.floor(edge * quality * 3000);
        return 'D'.repeat(raw - (raw % 4));
      },
    );
    assert.equal(fitted.mimeType, 'image/jpeg');
    const transport = imageTransportBytes('image/jpeg', fitted.data.length);
    assert.equal(transport <= GENERATE_BODY_BUDGET, true);
    assert.equal(transport < PLATFORM_BODY_LIMIT, true);
  });

  it('reports the link limit when shrinking cannot catch the budget', () => {
    const tooLong = 'E'.repeat(4_200_000);
    assert.throws(
      () => fitImageBase64({ mimeType: 'image/jpeg', data: 'F'.repeat(base64LengthForBytes(3_400_000)) }, () => tooLong),
      { message: ATTACHMENT_TOO_LARGE },
    );
  });

  it('names the size limit for a platform payload rejection', () => {
    assert.equal(rejectionMessage(413, 'Request Entity Too Large', undefined), ATTACHMENT_TOO_LARGE);
    assert.equal(rejectionMessage(413, '', undefined), ATTACHMENT_TOO_LARGE);
    assert.equal(
      rejectionMessage(502, 'PAYLOAD_TOO_LARGE', undefined),
      ATTACHMENT_TOO_LARGE,
    );
    assert.equal(
      rejectionMessage(500, 'A server error has occurred', undefined),
      'API interface destabilized. Check network link.',
    );
    assert.equal(rejectionMessage(400, '{}', 'Text is required.'), 'Text is required.');
  });
});
