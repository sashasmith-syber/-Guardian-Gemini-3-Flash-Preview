import { ATTACHMENT_TOO_LARGE, base64LengthForBytes, imageTransportBytes, GENERATE_BODY_BUDGET, shrinkToJpeg } from './imageBudget.ts';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export type PreparedImage = {
  dataUrl: string;
  scaled: boolean;
};

function normalizeMime(type: string): string {
  if (type === 'image/jpg') return 'image/jpeg';
  return type.toLowerCase();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function jpegBase64(bitmap: ImageBitmap, longestEdge: number, quality: number): string {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, longestEdge / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image could not be prepared.');
  context.drawImage(bitmap, 0, 0, width, height);
  const url = canvas.toDataURL('image/jpeg', quality);
  const match = url.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('Image could not be prepared.');
  return match[1];
}

export async function prepareImageFile(file: File): Promise<PreparedImage> {
  const mimeType = normalizeMime(file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ALLOWED.has(mimeType) && imageTransportBytes(mimeType, base64LengthForBytes(bytes.length)) <= GENERATE_BODY_BUDGET) {
    return { dataUrl: `data:${mimeType};base64,${bytesToBase64(bytes)}`, scaled: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(ATTACHMENT_TOO_LARGE);
  }
  try {
    const fitted = shrinkToJpeg((edge, quality) => jpegBase64(bitmap, edge, quality));
    return { dataUrl: `data:${fitted.mimeType};base64,${fitted.data}`, scaled: true };
  } finally {
    bitmap.close();
  }
}
