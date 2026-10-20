import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import type { BubbleOp, BubbleResult } from './bubble.ts';
import { KeyRing } from './key-ring.ts';
import { RateGate } from './rate-gate.ts';
import { handleBubbleRequest, productionBubbleDeps, type VercelBubbleDeps } from './vercel.ts';

const SECRET = 'vercel-test-key-do-not-leak';

function deps(invoke: VercelBubbleDeps['invoke'], options?: { secrets?: string[]; limit?: number; maxBodyBytes?: number }): VercelBubbleDeps {
  const secrets = options?.secrets ?? [SECRET];
  return {
    ring: new KeyRing({ secrets, strategy: 'failover', cooldownMs: 60_000 }),
    gate: new RateGate(options?.limit ?? 10, 60_000),
    maxBodyBytes: options?.maxBodyBytes ?? 1000,
    invoke,
    now: () => 1_700_000_000_000,
    log: () => {},
  };
}

function post(path: string, body: string, init?: { origin?: string; host?: string; contentType?: string; ip?: string }): Request {
  const headers = new Headers();
  if (init?.contentType !== '') headers.set('content-type', init?.contentType ?? 'application/json');
  if (init?.origin) headers.set('origin', init.origin);
  if (init?.host) headers.set('x-forwarded-host', init.host);
  if (init?.ip) headers.set('x-real-ip', init.ip);
  return new Request(`https://guardian.example${path}`, {
    method: 'POST',
    headers,
    body,
  });
}

describe('vercel bubble adapter', () => {
  it('serves generate through the same bubble and hides the key', async () => {
    let seen = '';
    const response = await handleBubbleRequest(
      post('/api/generate', JSON.stringify({ text: 'status' }), {
        origin: 'https://guardian.example',
        host: 'guardian.example',
      }),
      '/api/generate',
      deps(async (apiKey) => {
        seen = apiKey;
        return { text: 'clear' };
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const payload = await response.json() as { text?: string };
    assert.equal(payload.text, 'clear');
    assert.equal(seen, SECRET);
    assert.equal(JSON.stringify(payload).includes(SECRET), false);
  });

  it('reports health from the configured key ring', async () => {
    const response = await handleBubbleRequest(
      new Request('https://guardian.example/api/health'),
      '/api/health',
      deps(async () => ({ text: 'unused' }), { secrets: [] }),
    );
    assert.equal(response.status, 200);
    const payload = await response.json() as { ready?: boolean; keys?: number };
    assert.equal(payload.ready, false);
    assert.equal(payload.keys, 0);
  });

  it('rejects a missing content type, invalid JSON, an oversized body, and a foreign origin', async () => {
    const invoke = async (_apiKey: string, _op: BubbleOp): Promise<BubbleResult> => ({ text: 'nope' });
    const missingType = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}', { contentType: '' }),
      '/api/generate',
      deps(invoke),
    );
    assert.equal(missingType.status, 415);

    const invalid = await handleBubbleRequest(
      post('/api/generate', '{'),
      '/api/generate',
      deps(invoke),
    );
    assert.equal(invalid.status, 400);

    const oversized = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}'),
      '/api/generate',
      deps(invoke, { maxBodyBytes: 4 }),
    );
    assert.equal(oversized.status, 413);

    const foreign = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}', {
        origin: 'https://evil.example',
        host: 'guardian.example',
      }),
      '/api/generate',
      deps(invoke),
    );
    assert.equal(foreign.status, 403);
  });

  it('rate limits on the platform client address', async () => {
    const gate = deps(async () => ({ text: 'ok' }), { limit: 1 });
    const first = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}', { ip: '203.0.113.8' }),
      '/api/generate',
      gate,
    );
    const second = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}', { ip: '203.0.113.8' }),
      '/api/generate',
      gate,
    );
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
  });

  it('keeps image analysis on the live text model', () => {
    const source = readFileSync(new URL('./gemini.ts', import.meta.url), 'utf8');
    assert.equal(source.includes('gemini-3-pro-preview'), false);
    assert.equal(source.includes("const TEXT_MODEL = 'gemini-3-flash-preview'"), true);
  });

  it('caps the production body limit at the platform maximum and reads only server env', () => {
    const configured = productionBubbleDeps({
      GEMINI_API_KEY: SECRET,
      BUBBLE_MAX_BODY_BYTES: '8000000',
      VITE_GEMINI_API_KEY: 'browser-key',
    });
    assert.equal(configured.maxBodyBytes, 4_500_000);
    assert.deepEqual(configured.ring.secrets(), [SECRET]);
  });
});
