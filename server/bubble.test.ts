import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, it } from 'node:test';
import { dispatchBubble, type BubbleOp, type BubbleResult } from './bubble.ts';
import { createBubbleMiddleware } from './http.ts';
import { KeyRing } from './key-ring.ts';
import { RateGate } from './rate-gate.ts';

const SECRET_A = 'alpha-key-do-not-leak';
const SECRET_B = 'beta-key-do-not-leak';
const now = () => 1_700_000_000_000;

function ring(strategy: 'failover' | 'round-robin' = 'failover', secrets = [SECRET_A, SECRET_B]) {
  return new KeyRing({ secrets, strategy, cooldownMs: 60_000 });
}

async function post(path: string, body: unknown, invoke: (apiKey: string, op: BubbleOp) => Promise<BubbleResult>, options?: {
  origin?: string;
  host?: string;
  ip?: string;
  limit?: number;
  secrets?: string[];
}) {
  return dispatchBubble(
    {
      method: 'POST',
      path,
      origin: options?.origin,
      host: options?.host ?? '127.0.0.1:3000',
      ip: options?.ip ?? '127.0.0.1',
      body,
    },
    {
      ring: ring('failover', options?.secrets ?? [SECRET_A, SECRET_B]),
      gate: new RateGate(options?.limit ?? 10, 60_000),
      invoke,
      now,
      log: () => {},
    },
  );
}

describe('safe bubble', () => {
  it('rotates off a quota failure and never returns key material', async () => {
    const seen: string[] = [];
    const response = await post('/api/generate', { text: 'status' }, async (apiKey) => {
      seen.push(apiKey);
      if (apiKey === SECRET_A) {
        throw Object.assign(new Error(`quota exceeded for ${SECRET_A} AIzaSyA1234567890abcdef`), { status: 429 });
      }
      return { text: 'clear' };
    });
    assert.deepEqual(seen, [SECRET_A, SECRET_B]);
    assert.equal(response.status, 200);
    const encoded = JSON.stringify(response.body);
    assert.equal(encoded.includes(SECRET_A), false);
    assert.equal(encoded.includes(SECRET_B), false);
    assert.equal(response.body.text, 'clear');
  });

  it('does not rotate a non-key upstream error', async () => {
    let calls = 0;
    const response = await post('/api/generate', { text: 'status' }, async () => {
      calls += 1;
      throw Object.assign(new Error(`bad request ${SECRET_A}`), { status: 400 });
    });
    assert.equal(calls, 1);
    assert.equal(response.status, 502);
    assert.equal(JSON.stringify(response.body).includes(SECRET_A), false);
    assert.equal(response.body.error, 'API interface destabilized. Check network link.');
  });

  it('reports a closed bubble when no key is configured', async () => {
    const response = await post('/api/generate', { text: 'status' }, async () => ({ text: 'nope' }), { secrets: [] });
    assert.equal(response.status, 503);
    assert.equal(response.body.error, 'API interface is not configured.');
  });

  it('refuses a foreign origin and limits repeated calls', async () => {
    const forbidden = await post(
      '/api/generate',
      { text: 'status' },
      async () => ({ text: 'ok' }),
      { origin: 'https://evil.example' },
    );
    assert.equal(forbidden.status, 403);

    const gate = new RateGate(1, 60_000);
    const deps = {
      ring: ring(),
      gate,
      invoke: async () => ({ audioBase64: 'AAAA' as const }),
      now,
    };
    const first = await dispatchBubble(
      { method: 'POST', path: '/api/tts', host: '127.0.0.1:3000', ip: '10.0.0.8', body: { text: 'speak' } },
      deps,
    );
    const second = await dispatchBubble(
      { method: 'POST', path: '/api/tts', host: '127.0.0.1:3000', ip: '10.0.0.8', body: { text: 'speak again' } },
      deps,
    );
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
  });

  it('rejects disallowed media and publishes health without secrets', async () => {
    const image = await post('/api/generate', {
      text: 'look',
      image: { mimeType: 'image/svg+xml', data: 'AAAA' },
    }, async () => ({ text: 'nope' }));
    assert.equal(image.status, 400);

    const health = await dispatchBubble(
      { method: 'GET', path: '/api/health', host: '127.0.0.1:3000', ip: '127.0.0.1' },
      { ring: ring(), gate: new RateGate(10, 60_000), invoke: async () => ({ text: '' }), now },
    );
    assert.equal(health.status, 200);
    assert.equal(health.body.bubble, 'closed');
    assert.equal(health.body.keys, 2);
    assert.equal(JSON.stringify(health.body).includes(SECRET_A), false);
  });
});

describe('bubble http boundary', () => {
  it('enforces the body limit and leaves non-api routes alone', async () => {
    const middleware = createBubbleMiddleware({
      ring: ring('failover', []),
      gate: new RateGate(10, 60_000),
      maxBodyBytes: 32,
      invoke: async () => ({ text: 'unused' }),
      now,
    });
    const server = createServer((req, res) => {
      middleware(req, res, () => {
        res.statusCode = 204;
        res.end();
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const base = `http://127.0.0.1:${port}`;
    try {
      const page = await fetch(`${base}/`);
      assert.equal(page.status, 204);
      const oversized = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: `127.0.0.1:${port}` },
        body: JSON.stringify({ text: 'x'.repeat(80) }),
      });
      const payload = await oversized.json() as { error?: string };
      assert.equal(oversized.status, 413);
      assert.equal(payload.error, 'Request body is too large.');
    } finally {
      server.close();
    }
  });
});
