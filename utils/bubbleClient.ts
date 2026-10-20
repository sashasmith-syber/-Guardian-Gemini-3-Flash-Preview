import { ATTACHMENT_TOO_LARGE } from './imageBudget.ts';

const LINK_ERROR = 'API interface destabilized. Check network link.';

export function rejectionMessage(status: number, raw: string, payloadError: unknown): string {
  if (status === 413 || /PAYLOAD_TOO_LARGE|Request Entity Too Large/i.test(raw)) return ATTACHMENT_TOO_LARGE;
  if (typeof payloadError === 'string' && payloadError.trim()) return payloadError;
  return LINK_ERROR;
}

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
  const raw = await response.text();
  let payload: { error?: unknown } = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as { error?: unknown };
    } catch {
      payload = {};
    }
  }
  if (!response.ok) throw new Error(rejectionMessage(response.status, raw, payload.error));
  return payload as T;
}

export function imagePayload(dataUrl: string | undefined): { mimeType: string; data: string } | undefined {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return undefined;
  return { mimeType: match[1], data: match[2] };
}
