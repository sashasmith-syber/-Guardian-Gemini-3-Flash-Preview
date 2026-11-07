import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function source(name: string): string {
  return readFileSync(path.join(root, name), 'utf8');
}

describe('client boundary', () => {
  it('does not inline the Gemini key into the browser bundle', () => {
    const vite = source('vite.config.ts');
    const client = source('index.tsx');
    const html = source('index.html');
    const terminal = source('components/GuardianTerminal.tsx');
    const bubble = source('utils/bubbleClient.ts');
    const browserSources = [
      client,
      terminal,
      bubble,
      source('components/Header.tsx'),
      source('utils/prepareImage.ts'),
      source('utils/imageBudget.ts'),
      source('utils/bubbleHealth.ts'),
    ];
    assert.equal(vite.includes('process.env.API_KEY'), false);
    assert.equal(vite.includes('process.env.GEMINI_API_KEY'), false);
    assert.equal(vite.includes('JSON.stringify(env'), false);
    for (const file of browserSources) {
      assert.equal(file.includes('process.env.API_KEY'), false);
      assert.equal(file.includes('process.env.GEMINI_API_KEY'), false);
      assert.equal(file.includes('process.env.GUARDIAN_OPERATOR_PASSWORD'), false);
      assert.equal(file.includes('@google/genai'), false);
      assert.equal(file.includes('VITE_GEMINI_API_KEY'), false);
      assert.equal(file.includes('GUARDIAN_OPERATOR_PASSWORD'), false);
    }
    assert.equal(html.includes('@google/genai'), false);
    assert.equal(html.includes('cdn.tailwindcss.com'), false);
    assert.equal(html.includes('esm.sh'), false);
    assert.equal(html.includes('fonts.googleapis.com'), false);
    assert.equal(vite.includes("|| '127.0.0.1'"), true);
    assert.equal(client.includes("'/api/generate'"), true);
    assert.equal(client.includes("'/api/health'") || source('utils/bubbleHealth.ts').includes("'/api/health'"), true);
    assert.equal(client.includes('onboardGuardianReply'), true);
    assert.equal(client.includes('TACTICAL INVESTIGATION BRIEF'), false);
    assert.equal(client.includes('gemini-3.8-flash'), false);
    assert.equal(terminal.includes('prepareImageFile'), true);
    assert.equal(terminal.includes("'/api/transcribe'"), true);
    assert.equal(terminal.includes("'/api/tts'"), true);
    for (const route of ['api/health.ts', 'api/generate.ts', 'api/transcribe.ts', 'api/tts.ts', 'api/session.ts']) {
      const file = source(route);
      assert.equal(file.includes('handleBubbleRequest'), true);
      assert.equal(file.includes('GEMINI_API_KEY'), false);
      assert.equal(file.includes('@google/genai'), false);
    }
  });

  it('keeps Vite network and filesystem defaults and separates production headers', () => {
    const vite = source('vite.config.ts');
    assert.match(vite, /process\.env\.HOST \|\| localEnv\.HOST \|\| '127\.0\.0\.1'/);
    assert.equal(vite.includes('allowedHosts:'), false);
    assert.equal(vite.includes('cors:'), false);
    assert.equal(vite.includes('fs:'), false);
    assert.match(vite, /server:\s*\{[\s\S]*?host,[\s\S]*?\n\s*\},\s*preview:/);
    assert.match(vite, /preview:\s*\{[\s\S]*?host,/);

    const productionHeaders = JSON.parse(source('vercel.json')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const headers = new Map(productionHeaders.headers[0].headers.map(({ key, value }) => [key, value]));
    assert.equal(headers.get('Strict-Transport-Security'), 'max-age=31536000');
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(headers.get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(headers.get('X-Frame-Options'), 'DENY');
  });

  it('keeps placeholder hints above the text contrast floor and named', () => {
    const terminal = source('components/GuardianTerminal.tsx');
    const alerts = source('components/StrategicAlertFeed.tsx');
    const telemetry = source('components/TelemetryGrid.tsx');
    for (const file of [terminal, alerts, telemetry]) {
      assert.equal(file.includes('placeholder-[#00f2ff]/30'), false);
      assert.equal(file.includes('guardian-field'), true);
    }
    assert.equal(terminal.includes('htmlFor="guardian-directive"'), true);
    assert.equal(terminal.includes('SYNCHRONIZING CORE...'), false);
    assert.equal(alerts.includes('htmlFor="alert-search"'), true);
    assert.equal(telemetry.includes('htmlFor="node-search"'), true);
    assert.equal(telemetry.includes('No nodes match the active filter criteria.'), true);
    assert.equal(source('index.css').includes('color: #7ad7e0'), true);
  });
});
