import type { Plugin } from 'vite';
import { loadLayeredEnv } from './env-file.ts';
import { invokeGemini } from './gemini.ts';
import { createBubbleMiddleware } from './http.ts';
import { KeyRing } from './key-ring.ts';
import { redact } from './redact.ts';
import { RateGate } from './rate-gate.ts';
import { loadBubbleSettings } from './settings.ts';

export function loadLocalEnv(root = process.cwd()): Record<string, string | undefined> {
  return loadLayeredEnv(root, process.env);
}

export function guardianBubblePlugin(root = process.cwd()): Plugin {
  const settings = loadBubbleSettings(loadLocalEnv(root));
  const ring = new KeyRing(settings);
  const gate = new RateGate(settings.rateLimit, settings.rateWindowMs);
  const middleware = createBubbleMiddleware({
    ring,
    gate,
    maxBodyBytes: settings.maxBodyBytes,
    invoke: invokeGemini,
    log: (line) => {
      console.error(redact(line, ring.secrets()));
    },
  });

  const summary = ring.size === 0
    ? 'Guardian bubble has no API keys configured.'
    : `Guardian bubble ready: ${ring.size} key(s), strategy=${ring.strategy}.`;

  return {
    name: 'guardian-safe-bubble',
    configureServer(server) {
      server.middlewares.use(middleware);
      server.httpServer?.once('listening', () => {
        server.config.logger.info(summary);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
      server.config.logger.info(summary);
    },
  };
}
