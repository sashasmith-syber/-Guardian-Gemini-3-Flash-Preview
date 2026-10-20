const LINK_ERROR = 'API interface destabilized. Check network link.';

/** Matches the image types the safe bubble accepts. */
export const OPERATOR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const OPERATOR_IMAGE_TYPE_SET = new Set<string>(OPERATOR_IMAGE_TYPES);
export const MAX_OPERATOR_IMAGE_BYTES = 4_000_000;

export async function bubblePost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(LINK_ERROR);
  }
  let payload: { error?: unknown } = {};
  try {
    payload = await response.json();
  } catch {
    throw new Error(LINK_ERROR);
  }
  if (!response.ok) {
    const message = typeof payload.error === 'string' && payload.error.trim() ? payload.error : LINK_ERROR;
    throw new Error(message);
  }
  return payload as T;
}

export function imagePayload(dataUrl: string | undefined): { mimeType: string; data: string } | undefined {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return undefined;
  const mimeType = match[1].toLowerCase();
  if (!OPERATOR_IMAGE_TYPE_SET.has(mimeType)) return undefined;
  return { mimeType, data: match[2] };
}
