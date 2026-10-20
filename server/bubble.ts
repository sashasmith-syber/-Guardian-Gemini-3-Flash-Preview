import type { KeyRing } from './key-ring.ts';
import type { RateGate } from './rate-gate.ts';
import { redact } from './redact.ts';

const ROTATE_STATUSES = new Set([401, 403, 429]);
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const AUDIO_TYPES = new Set(['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']);
const MAX_TEXT = 16_000;

export type BubbleOp =
  | { kind: 'generate'; text: string; image?: { mimeType: string; data: string } }
  | { kind: 'transcribe'; audioBase64: string; mimeType: string }
  | { kind: 'tts'; text: string };

export type BubbleResult = { text: string } | { audioBase64: string };

export type BubbleRequest = {
  method: string;
  path: string;
  origin?: string;
  host?: string;
  ip: string;
  body?: unknown;
};

export type BubbleResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type BubbleDeps = {
  ring: KeyRing;
  gate: RateGate;
  invoke: (apiKey: string, op: BubbleOp) => Promise<BubbleResult>;
  now?: () => number;
  log?: (line: string) => void;
};

export function sameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function readErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err && 'status' in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === 'number' && Number.isFinite(status)) return status;
  }
  return undefined;
}

function shouldRotate(err: unknown): boolean {
  const status = readErrorStatus(err);
  if (status !== undefined && ROTATE_STATUSES.has(status)) return true;
  if (status === 400 && err instanceof Error) return /api key/i.test(err.message);
  return false;
}

function isBase64(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function parseOp(path: string, body: unknown): { ok: true; op: BubbleOp } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body is not valid.' };
  }
  const record = body as Record<string, unknown>;

  if (path === '/api/generate') {
    const text = typeof record.text === 'string' ? record.text : '';
    if (text.length > MAX_TEXT) return { ok: false, error: 'Text is too long.' };
    let image: { mimeType: string; data: string } | undefined;
    if (record.image !== undefined && record.image !== null) {
      if (typeof record.image !== 'object' || Array.isArray(record.image)) {
        return { ok: false, error: 'Request body is not valid.' };
      }
      const imageRecord = record.image as Record<string, unknown>;
      const mimeType = imageRecord.mimeType;
      const data = imageRecord.data;
      if (typeof mimeType !== 'string' || !IMAGE_TYPES.has(mimeType)) {
        return { ok: false, error: 'Image type is not allowed.' };
      }
      if (typeof data !== 'string' || !isBase64(data)) {
        return { ok: false, error: 'Image payload is not valid base64.' };
      }
      image = { mimeType, data };
    }
    if (!text.trim() && !image) return { ok: false, error: 'Text is required.' };
    return { ok: true, op: { kind: 'generate', text, image } };
  }

  if (path === '/api/transcribe') {
    const mimeType = record.mimeType;
    const audioBase64 = record.audioBase64;
    if (typeof mimeType !== 'string' || !AUDIO_TYPES.has(mimeType)) {
      return { ok: false, error: 'Audio type is not allowed.' };
    }
    if (typeof audioBase64 !== 'string' || !isBase64(audioBase64)) {
      return { ok: false, error: 'Audio payload is not valid base64.' };
    }
    return { ok: true, op: { kind: 'transcribe', audioBase64, mimeType } };
  }

  if (path === '/api/tts') {
    if (typeof record.text !== 'string' || !record.text.trim()) {
      return { ok: false, error: 'Text is required.' };
    }
    if (record.text.length > MAX_TEXT) return { ok: false, error: 'Text is too long.' };
    return { ok: true, op: { kind: 'tts', text: record.text.slice(0, 500) } };
  }

  return { ok: false, error: 'Unknown API route.' };
}

async function withRotation(
  ring: KeyRing,
  invoke: BubbleDeps['invoke'],
  op: BubbleOp,
  now: () => number,
): Promise<BubbleResult> {
  if (ring.size === 0) {
    throw Object.assign(new Error('API interface is not configured.'), { status: 503, code: 'unconfigured' });
  }
  const exclude = new Set<string>();
  let last: unknown;
  for (let attempt = 0; attempt < ring.size; attempt += 1) {
    const key = ring.acquire(exclude, now());
    if (!key) break;
    exclude.add(key.id);
    try {
      const result = await invoke(key.secret, op);
      ring.reportSuccess(key.id);
      return result;
    } catch (err) {
      last = err;
      if (shouldRotate(err)) {
        ring.reportFailure(key.id, now());
        continue;
      }
      throw err;
    }
  }
  if (!last) {
    throw Object.assign(new Error('API keys are cooling down. Retry shortly.'), { status: 503, code: 'cooling' });
  }
  throw last;
}

export async function dispatchBubble(request: BubbleRequest, deps: BubbleDeps): Promise<BubbleResponse> {
  const now = deps.now ?? Date.now;
  const secrets = deps.ring.secrets();
  const log = (line: string) => deps.log?.(redact(line, secrets));

  if (!sameOrigin(request.origin, request.host)) {
    return { status: 403, body: { error: 'Cross-origin request refused.' } };
  }

  const method = request.method.toUpperCase();
  if (method === 'GET' && request.path === '/api/health') {
    const cooling = deps.ring.coolingCount(now());
    return {
      status: 200,
      body: {
        ok: true,
        bubble: 'closed',
        ready: deps.ring.size > 0 && cooling < deps.ring.size,
        strategy: deps.ring.strategy,
        keys: deps.ring.size,
        cooling,
      },
    };
  }

  if (request.path !== '/api/generate' && request.path !== '/api/transcribe' && request.path !== '/api/tts') {
    return { status: 404, body: { error: 'Unknown API route.' } };
  }
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed.' } };
  }
  if (!deps.gate.allow(request.ip || 'local', now())) {
    return { status: 429, body: { error: 'Rate limit exceeded.' } };
  }

  const parsed = parseOp(request.path, request.body);
  if (parsed.ok === false) return { status: 400, body: { error: parsed.error } };

  try {
    const result = await withRotation(deps.ring, deps.invoke, parsed.op, now);
    return { status: 200, body: result };
  } catch (err) {
    const status = readErrorStatus(err);
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : undefined;
    const raw = err instanceof Error ? err.message : 'Upstream request failed.';
    log(`${request.path} failed status=${status ?? 'none'} ${raw}`);
    if (code === 'unconfigured' || code === 'cooling') {
      return { status: 503, body: { error: redact(raw, secrets) } };
    }
    return { status: 502, body: { error: 'API interface destabilized. Check network link.' } };
  }
}
