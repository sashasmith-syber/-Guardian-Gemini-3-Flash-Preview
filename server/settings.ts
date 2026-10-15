export type KeyStrategy = 'failover' | 'round-robin';

export type BubbleSettings = {
  secrets: string[];
  strategy: KeyStrategy;
  cooldownMs: number;
  maxBodyBytes: number;
  rateLimit: number;
  rateWindowMs: number;
};

export function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function loadBubbleSettings(env: Record<string, string | undefined>): BubbleSettings {
  const primary = (env.GEMINI_API_KEY ?? '').trim();
  const extras = (env.GEMINI_API_KEYS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const secrets: string[] = [];
  for (const secret of [primary, ...extras]) {
    if (secret && !secrets.includes(secret)) secrets.push(secret);
  }
  const strategy: KeyStrategy = env.GEMINI_KEY_STRATEGY === 'round-robin' ? 'round-robin' : 'failover';
  return {
    secrets,
    strategy,
    cooldownMs: clampInt(env.GEMINI_KEY_COOLDOWN_MS, 60_000, 0, 24 * 60 * 60 * 1000),
    maxBodyBytes: clampInt(env.BUBBLE_MAX_BODY_BYTES, 8_000_000, 1024, 20_000_000),
    rateLimit: clampInt(env.BUBBLE_RATE_LIMIT, 30, 1, 1000),
    rateWindowMs: clampInt(env.BUBBLE_RATE_WINDOW_MS, 60_000, 1000, 24 * 60 * 60 * 1000),
  };
}
