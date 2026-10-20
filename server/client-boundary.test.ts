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
    const browserSources = [client, terminal, bubble, source('components/Header.tsx')];
    assert.equal(vite.includes('process.env.API_KEY'), false);
    assert.equal(vite.includes('process.env.GEMINI_API_KEY'), false);
    assert.equal(vite.includes('JSON.stringify(env'), false);
    for (const file of browserSources) {
      assert.equal(file.includes('process.env.API_KEY'), false);
      assert.equal(file.includes('process.env.GEMINI_API_KEY'), false);
      assert.equal(file.includes('@google/genai'), false);
      assert.equal(file.includes('VITE_GEMINI_API_KEY'), false);
    }
    assert.equal(html.includes('@google/genai'), false);
    assert.equal(html.includes('cdn.tailwindcss.com'), false);
    assert.equal(html.includes('esm.sh'), false);
    assert.equal(html.includes('fonts.googleapis.com'), false);
    assert.equal(vite.includes("|| '127.0.0.1'"), true);
    assert.equal(client.includes("'/api/generate'"), true);
    assert.equal(client.includes('gemini-3.8-flash'), false);
    assert.equal(terminal.includes("'/api/transcribe'"), true);
    assert.equal(terminal.includes("'/api/tts'"), true);
    for (const route of ['api/health.ts', 'api/generate.ts', 'api/transcribe.ts', 'api/tts.ts']) {
      const file = source(route);
      assert.equal(file.includes('handleBubbleRequest'), true);
      assert.equal(file.includes('GEMINI_API_KEY'), false);
      assert.equal(file.includes('@google/genai'), false);
    }
  });
});
