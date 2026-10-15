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
    assert.equal(vite.includes('process.env.API_KEY'), false);
    assert.equal(vite.includes('process.env.GEMINI_API_KEY'), false);
    assert.equal(vite.includes('JSON.stringify(env'), false);
    assert.equal(client.includes('process.env.API_KEY'), false);
    assert.equal(client.includes('@google/genai'), false);
    assert.equal(html.includes('@google/genai'), false);
    assert.equal(html.includes('cdn.tailwindcss.com'), false);
    assert.equal(html.includes('esm.sh'), false);
    assert.equal(html.includes('fonts.googleapis.com'), false);
    assert.equal(vite.includes("|| '127.0.0.1'"), true);
    assert.equal(client.includes("'/api/generate'"), true);
  });
});
