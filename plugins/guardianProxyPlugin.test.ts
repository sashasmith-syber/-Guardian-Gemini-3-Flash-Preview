import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('vite client key hardening', () => {
  it('does not inject GEMINI_API_KEY into the client via define', () => {
    const config = readFileSync(resolve(__dirname, '../vite.config.ts'), 'utf8');
    expect(config).not.toMatch(/process\.env\.API_KEY/);
    expect(config).not.toMatch(/JSON\.stringify\(env\.GEMINI_API_KEY\)/);
    expect(config).toMatch(/host:\s*'127\.0\.0\.1'/);
    expect(config).toMatch(/guardianProxyPlugin/);
  });

  it('keeps Gemini SDK usage on the server plugin, not index.tsx', () => {
    const index = readFileSync(resolve(__dirname, '../index.tsx'), 'utf8');
    const terminal = readFileSync(resolve(__dirname, '../components/GuardianTerminal.tsx'), 'utf8');
    expect(index).not.toMatch(/@google\/genai/);
    expect(terminal).not.toMatch(/@google\/genai/);
    expect(index).toMatch(/generateGuardianReply/);
    expect(terminal).toMatch(/synthesizeGuardianSpeech/);
  });
});
