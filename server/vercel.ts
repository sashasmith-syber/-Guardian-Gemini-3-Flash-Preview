import { dispatchBubble, type BubbleDeps, type BubbleResponse } from './bubble.ts';
import { isJsonContentType } from './http.ts';
import { invokeGemini } from './gemini.ts';
import { KeyRing } from './key-ring.ts';
import { redact } from './redact.ts';
import { RateGate } from './rate-gate.ts';
import { loadBubbleSettings } from './settings.ts';

// Vercel rejects request bodies above 4.5 MB before the function runs.
const PLATFORM_BODY_CAP = 4_500_000;

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
    maxBodyBytes: Math.min(settings.maxBodyBytes, PLATFORM_BODY_CAP),
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
    },
  });
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
    let raw = '';
    try {
      raw = await request.text();
    } catch {
      return jsonResponse({ status: 400, body: { error: 'Request body must be JSON.' } });
    }
    if (Buffer.byteLength(raw) > deps.maxBodyBytes) {
      return jsonResponse({ status: 413, body: { error: 'Request body is too large.' } });
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
        ip: requestIp(request),
        body,
      },
      deps,
    );
    return jsonResponse(response);
  } catch {
    return jsonResponse({ status: 500, body: { error: 'API interface destabilized. Check network link.' } });
  }
}
