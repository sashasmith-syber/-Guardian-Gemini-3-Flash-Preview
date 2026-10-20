// Vercel drops the socket above this size before the function can return JSON.
export const PLATFORM_BODY_LIMIT = 4_500_000;

// Stay under the platform drop after base64 expansion and a full text field.
export const GENERATE_BODY_BUDGET = 4_000_000;

// Matches the bubble text cap so a long directive still fits beside the image.
export const TEXT_RESERVE = 16_000;

export const ATTACHMENT_TOO_LARGE = 'Attachment is too large for the upstream link. It must stay under 4.5 MB after encoding.';

const EDGES = [2048, 1600, 1280, 1024, 800];
const QUALITIES = [0.82, 0.7, 0.58, 0.45, 0.32];

export function envelopeBytes(textLength: number, mimeType: string, base64Length: number): number {
  return 9 + textLength + 23 + mimeType.length + 10 + base64Length + 3;
}

export function base64LengthForBytes(byteLength: number): number {
  return 4 * Math.ceil(byteLength / 3);
}

export function imageTransportBytes(mimeType: string, base64Length: number, textLength = TEXT_RESERVE): number {
  return envelopeBytes(textLength, mimeType, base64Length);
}

export function imageFits(mimeType: string, base64: string): boolean {
  return imageTransportBytes(mimeType, base64.length) <= GENERATE_BODY_BUDGET;
}

export type FittedImage = { mimeType: string; data: string };

export function shrinkToJpeg(encodeJpeg: (longestEdge: number, quality: number) => string): FittedImage {
  for (const edge of EDGES) {
    for (const quality of QUALITIES) {
      const data = encodeJpeg(edge, quality);
      if (imageFits('image/jpeg', data)) return { mimeType: 'image/jpeg', data };
    }
  }
  throw new Error(ATTACHMENT_TOO_LARGE);
}

export function fitImageBase64(
  original: FittedImage,
  encodeJpeg: (longestEdge: number, quality: number) => string,
): FittedImage {
  if (imageFits(original.mimeType, original.data)) return original;
  return shrinkToJpeg(encodeJpeg);
}
