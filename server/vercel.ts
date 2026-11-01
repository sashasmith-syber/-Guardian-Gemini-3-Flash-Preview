import { ATTACHMENT_TOO_LARGE, PLATFORM_BODY_LIMIT } from '../utils/imageBudget.ts';
import { dispatchBubble, type BubbleDeps, type BubbleResponse } from './bubble.ts';
import { isJsonContentType } from './http.ts';
import { invokeGemini } from './gemini.ts';
import { KeyRing } from './key-ring.ts';
import { redact } from './redact.ts';
import { RateGate } from './rate-gate.ts';
import { loadBubbleSettings } from './settings.ts';

export type VercelBubbleDeps = BubbleDeps & {
  maxBodyBytes: number;
};

let liveDeps: VercelBubbleDeps | undefined;

export function productionBubbleDeps(env: Record<string, string | undefined>): VercelBubbleDeps {
  const settings = loadBubbleSettings(env);
  const ring = new KeyRing(settings);
  return {
    ring,
    gate: new RateGate(settings.rateLimit, settings.rateWindowMs),
    authGate: new RateGate(settings.authRateLimit, settings.rateWindowMs),
    operatorPassword: settings.operatorPassword,
    maxBodyBytes: Math.min(settings.maxBodyBytes, PLATFORM_BODY_LIMIT),
    invoke: invokeGemini,
    log: (line) => {
      console.error(redact(line, ring.secrets()));
    },
  };
}

function liveBubbleDeps(): VercelBubbleDeps {
  liveDeps ??= productionBubbleDeps(process.env);
  return liveDeps;
}

function firstHeaderValue(value: string | null): string | undefined {
  const first = value?.split(',')[0]?.trim();
  return first ? first : undefined;
}

export function requestHost(request: Request): string | undefined {
  return firstHeaderValue(request.headers.get('x-forwarded-host'))
    ?? firstHeaderValue(request.headers.get('host'))
    ?? safeUrlHost(request.url);
}

export function requestIp(request: Request): string {
  return firstHeaderValue(request.headers.get('x-real-ip'))
    ?? firstHeaderValue(request.headers.get('x-forwarded-for'))
    ?? 'vercel';
}

function safeUrlHost(url: string): string | undefined {
  try {
    return new URL(url).host || undefined;
  } catch {
    return undefined;
  }
}

function jsonResponse(response: BubbleResponse): Response {
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'permissions-policy': 'camera=(), microphone=(self), geolocation=()',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
    },
  });
}

async function readLimitedBody(request: Request, limit: number): Promise<string> {
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      throw Object.assign(new Error('Invalid Content-Length.'), { statusCode: 400 });
    }
    if (Number(contentLength) > limit) {
      throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
    }
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        void reader.cancel().catch(() => {});
        throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

export async function handleBubbleRequest(
  request: Request,
  path: string,
  deps: VercelBubbleDeps = liveBubbleDeps(),
): Promise<Response> {
  let body: unknown;
  if (request.method.toUpperCase() === 'POST') {
    const contentType = request.headers.get('content-type') ?? undefined;
    if (!isJsonContentType(contentType)) {
      return jsonResponse({ status: 415, body: { error: 'Content-Type must be application/json.' } });
    }
    let raw: string;
    try {
      const maxBodyBytes = path === '/api/session' ? Math.min(deps.maxBodyBytes, 4096) : deps.maxBodyBytes;
      raw = await readLimitedBody(request, maxBodyBytes);
    } catch (error) {
      const status = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 400;
      return jsonResponse({
        status: status === 413 ? 413 : 400,
        body: { error: status === 413 ? ATTACHMENT_TOO_LARGE : 'Request body must be JSON.' },
      });
    }
    try {
      body = raw.length === 0 ? {} : JSON.parse(raw) as unknown;
    } catch {
      return jsonResponse({ status: 400, body: { error: 'Request body must be JSON.' } });
    }
  }

  try {
    const response = await dispatchBubble(
      {
        method: request.method,
        path,
        origin: request.headers.get('origin') ?? undefined,
        host: requestHost(request),
        cookie: request.headers.get('cookie') ?? undefined,
        secure: new URL(request.url).protocol === 'https:',
        ip: requestIp(request),
        body,
      },
      deps,
    );
    const result = jsonResponse(response);
    for (const [name, value] of Object.entries(response.headers ?? {})) {
      result.headers.set(name, value);
    }
    return result;
  } catch {
    return jsonResponse({ status: 500, body: { error: 'API interface destabilized. Check network link.' } });
  }
}
