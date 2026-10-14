import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { loadEnvFile, mergeEnv, parseEnv } from './env-file.ts';
import { loadBubbleSettings } from './settings.ts';

describe('env file', () => {
  it('parses quotes, exports, and comments', () => {
    const parsed = parseEnv(`
# comment
export GEMINI_API_KEY="quoted-key"
GEMINI_API_KEYS='one, two'
NOT VALID
`);
    assert.deepEqual(parsed, {
      GEMINI_API_KEY: 'quoted-key',
      GEMINI_API_KEYS: 'one, two',
    });
  });

  it('lets process env override the file and dedupes rotation keys', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'guardian-env-'));
    const file = path.join(dir, '.env');
    await writeFile(file, 'GEMINI_API_KEY=from-file\nGEMINI_KEY_STRATEGY=round-robin\n', { mode: 0o600 });
    const merged = mergeEnv(loadEnvFile(file), { GEMINI_API_KEY: 'from-shell', GEMINI_API_KEYS: 'from-shell, extra' });
    const settings = loadBubbleSettings(merged);
    assert.deepEqual(settings.secrets, ['from-shell', 'extra']);
    assert.equal(settings.strategy, 'round-robin');
  });

  it('returns an empty bag when the file is missing', () => {
    assert.deepEqual(loadEnvFile(path.join(tmpdir(), 'missing-guardian-env')), {});
  });
});
