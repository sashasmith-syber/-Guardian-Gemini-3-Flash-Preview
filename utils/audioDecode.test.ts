import { describe, expect, it } from 'vitest';
import { decodeBase64, decodePcmAudioData } from './audioDecode';

describe('decodeBase64', () => {
  it('round-trips ascii payload', () => {
    const bytes = decodeBase64(btoa('AB'));
    expect(Array.from(bytes)).toEqual([65, 66]);
  });
});

describe('decodePcmAudioData', () => {
  it('respects byteOffset of Uint8Array views', async () => {
    // Little-endian Int16 samples: 16384, -16384 → ~0.5, ~-0.5
    const raw = new Uint8Array([0x00, 0x40, 0x00, 0xc0]);
    const padded = new Uint8Array(8);
    padded.set([0xff, 0xff], 0);
    padded.set(raw, 2);
    const view = padded.subarray(2, 6);

    let channel: Float32Array | null = null;
    const fakeCtx = {
      createBuffer: (_channels: number, frameCount: number) => ({
        getChannelData: () => {
          channel = new Float32Array(frameCount);
          return channel;
        },
      }),
    } as unknown as AudioContext;

    await decodePcmAudioData(view, fakeCtx, 24000, 1);
    expect(channel).not.toBeNull();
    expect(channel![0]).toBeCloseTo(0.5, 2);
    expect(channel![1]).toBeCloseTo(-0.5, 2);
  });
});
