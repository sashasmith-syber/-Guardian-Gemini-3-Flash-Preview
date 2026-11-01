import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createSessionCookie } from './auth.ts';
import type { BubbleOp, BubbleResult } from './bubble.ts';
import { KeyRing } from './key-ring.ts';
import { RateGate } from './rate-gate.ts';
import { handleBubbleRequest, productionBubbleDeps, type VercelBubbleDeps } from './vercel.ts';

const SECRET = 'vercel-test-key-do-not-leak';
const PASSWORD = 'a-long-random-operator-password-123456789';
const SESSION_COOKIE = createSessionCookie(PASSWORD, PASSWORD, 1_700_000_000_000)!.split(';')[0];

function deps(invoke: VercelBubbleDeps['invoke'], options?: { secrets?: string[]; limit?: number; maxBodyBytes?: number }): VercelBubbleDeps {
  const secrets = options?.secrets ?? [SECRET];
  return {
    ring: new KeyRing({ secrets, strategy: 'failover', cooldownMs: 60_000 }),
    gate: new RateGate(options?.limit ?? 10, 60_000),
    authGate: new RateGate(5, 60_000),
    operatorPassword: PASSWORD,
    maxBodyBytes: options?.maxBodyBytes ?? 1000,
    invoke,
    now: () => 1_700_000_000_000,
    log: () => {},
  };
}

function post(path: string, body: string, init?: {
  origin?: string;
  host?: string;
  contentType?: string;
  ip?: string;
  cookie?: string;
  session?: boolean;
}): Request {
  const headers = new Headers();
  if (init?.contentType !== '') headers.set('content-type', init?.contentType ?? 'application/json');
  if (init?.origin) headers.set('origin', init.origin);
  if (init?.host) headers.set('x-forwarded-host', init.host);
  if (init?.ip) headers.set('x-real-ip', init.ip);
  if (init?.cookie) headers.set('cookie', init.cookie);
  else if (init?.session !== false) headers.set('cookie', SESSION_COOKIE);
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
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
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
    assert.equal('keys' in payload, false);
  });

  it('creates an HttpOnly operator session and requires it for provider requests', async () => {
    let calls = 0;
    const invoke = async (_apiKey: string, _op: BubbleOp): Promise<BubbleResult> => {
      calls += 1;
      return { text: 'ok' };
    };
    const denied = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}', { session: false }),
      '/api/generate',
      deps(invoke),
    );
    assert.equal(denied.status, 401);
    assert.equal(calls, 0);

    const login = await handleBubbleRequest(
      post('/api/session', JSON.stringify({ password: PASSWORD }), { session: false }),
      '/api/session',
      deps(invoke),
    );
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie') ?? '', /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const allowed = await handleBubbleRequest(
      post('/api/generate', '{"text":"status"}', { cookie }),
      '/api/generate',
      deps(invoke),
    );
    assert.equal(allowed.status, 200);
    assert.equal(calls, 1);
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
    assert.equal((await oversized.json() as { error?: string }).error, 'Attachment is too large for the upstream link. It must stay under 4.5 MB after encoding.');

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

  it('rejects an oversized session body before reading its content', async () => {
    const request = new Request('https://guardian.example/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '5000' },
    });
    const response = await handleBubbleRequest(request, '/api/session', deps(async () => ({ text: 'unused' })));
    assert.equal(response.status, 413);
    assert.equal((await response.json() as { error?: string }).error, 'Request body is too large.');
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
    assert.match(source, /const PROVIDER_TIMEOUT_MS = 40_000/);
    assert.match(source, /httpOptions: \{ timeout: PROVIDER_TIMEOUT_MS \}/);
    assert.match(source, /const MAX_OUTPUT_TOKENS = 1024/);
    assert.equal((source.match(/maxOutputTokens:/g) ?? []).length, 3);
  });

  it('caps the production body limit at the platform maximum and reads only server env', () => {
    const configured = productionBubbleDeps({
      GEMINI_API_KEY: SECRET,
      GUARDIAN_OPERATOR_PASSWORD: PASSWORD,
      BUBBLE_MAX_BODY_BYTES: '8000000',
      VITE_GEMINI_API_KEY: 'browser-key',
    });
    assert.equal(configured.maxBodyBytes, 4_500_000);
    assert.deepEqual(configured.ring.secrets(), [SECRET]);
  });
});

describe('vercel typescript emit', () => {
  it('rewrites .ts import specifiers to .js so the lambda can load', () => {
    const root = path.resolve(new URL('..', import.meta.url).pathname);
    const temp = mkdtempSync(path.join(tmpdir(), 'guardian-ts-emit-'));
    try {
      const source = path.join(temp, 'src');
      const output = path.join(temp, 'dist');
      const config = path.join(temp, 'tsconfig.json');
      const sourceFile = path.join(source, 'entry.ts');
      mkdirSync(source, { recursive: true });
      writeFileSync(path.join(source, 'target.ts'), 'export const target = true;\n');
      writeFileSync(sourceFile, "import { target } from './target.ts';\nexport { target };\n");
      writeFileSync(config, JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          rewriteRelativeImportExtensions: true,
          rootDir: source,
          outDir: output,
        },
        include: [path.join(source, '*.ts')],
      }));
      execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/lib/tsc.js'), '-p', config]);
      const javascript = readFileSync(path.join(output, 'entry.js'), 'utf8');
      assert.match(javascript, /from ["']\.\/target\.js["']/);
      assert.equal(javascript.includes('.ts'), false);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
