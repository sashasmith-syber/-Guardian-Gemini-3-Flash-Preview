import type { IncomingMessage, ServerResponse } from 'node:http';
import { dispatchBubble, type BubbleDeps } from './bubble.ts';

type Next = (err?: unknown) => void;

export type BubbleMiddlewareOptions = BubbleDeps & {
  maxBodyBytes: number;
};

export function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.split(';')[0]?.trim().toLowerCase() === 'application/json';
}

export function readLimitedBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    req.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      total += buf.length;
      if (total > limit) {
        fail(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        req.pause();
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      fail(err instanceof Error ? err : new Error('Request body could not be read.'));
    });
  });
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('permissions-policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('cross-origin-opener-policy', 'same-origin');
  res.setHeader('cross-origin-resource-policy', 'same-origin');
  for (const [name, value] of Object.entries(headers ?? {})) res.setHeader(name, value);
  res.end(payload);
}

export function createBubbleMiddleware(options: BubbleMiddlewareOptions) {
  return (req: IncomingMessage, res: ServerResponse, next: Next): void => {
    const path = (req.url ?? '/').split('?')[0] || '/';
    if (!path.startsWith('/api/')) {
      next();
      return;
    }

    void (async () => {
      const host = req.headers.host;
      const originHeader = req.headers.origin;
      const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
      let body: unknown;
      if ((req.method ?? 'GET').toUpperCase() === 'POST') {
        const contentType = req.headers['content-type'];
        const header = Array.isArray(contentType) ? contentType[0] : contentType;
        if (!isJsonContentType(header)) {
          sendJson(res, 415, { error: 'Content-Type must be application/json.' });
          return;
        }
        try {
          const limit = path === '/api/session' ? Math.min(options.maxBodyBytes, 4096) : options.maxBodyBytes;
          const contentLength = req.headers['content-length'];
          if (contentLength) {
            if (!/^\d+$/.test(contentLength)) {
              throw Object.assign(new Error('Invalid Content-Length.'), { statusCode: 400 });
            }
            if (Number(contentLength) > limit) {
              throw Object.assign(new Error('Request body is too large.'), { statusCode: 413 });
            }
          }
          const raw = await readLimitedBody(req, limit);
          body = raw.length === 0 ? {} : JSON.parse(raw.toString('utf8')) as unknown;
        } catch (err) {
          const statusCode = typeof err === 'object' && err && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
          if (statusCode === 413) {
            sendJson(res, 413, { error: 'Request body is too large.' });
            req.destroy();
            return;
          }
          sendJson(res, 400, { error: 'Request body must be JSON.' });
          return;
        }
      }

      const response = await dispatchBubble(
        {
          method: req.method ?? 'GET',
          path,
          origin,
          host,
          cookie: req.headers.cookie,
          secure: Boolean((req.socket as typeof req.socket & { encrypted?: boolean }).encrypted),
          ip: req.socket.remoteAddress ?? 'local',
          body,
        },
        options,
      );
      sendJson(res, response.status, response.body, response.headers);
    })().catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'API interface destabilized. Check network link.' });
    });
  };
}
