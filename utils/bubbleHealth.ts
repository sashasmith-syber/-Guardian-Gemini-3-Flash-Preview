export type BubbleHealth = {
  ok: boolean;
  ready: boolean;
  keys: number;
  cooling: number;
  strategy?: string;
  bubble?: string;
};

export const BUBBLE_NOT_CONFIGURED = 'API interface is not configured.';
export const BUBBLE_COOLING = 'API keys are cooling down. Retry shortly.';

export async function fetchBubbleHealth(): Promise<BubbleHealth | null> {
  try {
    const response = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<BubbleHealth>;
    return {
      ok: body.ok === true,
      ready: body.ready === true,
      keys: typeof body.keys === 'number' ? body.keys : 0,
      cooling: typeof body.cooling === 'number' ? body.cooling : 0,
      strategy: typeof body.strategy === 'string' ? body.strategy : undefined,
      bubble: typeof body.bubble === 'string' ? body.bubble : undefined,
    };
  } catch {
    return null;
  }
}

/** Honest onboard copy — no fake tactical briefs when the bubble is closed. */
export function onboardGuardianReply(reason: 'unconfigured' | 'cooling' | 'unreachable'): string {
  if (reason === 'cooling') {
    return `### BUBBLE COOLING — RETRY SHORTLY

OPERATOR: Gemini keys are in cooldown after auth or rate-limit pressure. No synthetic enclave brief was invented for this turn.

**Next steps**
1. Wait for the cooldown window (default 60s), then resend.
2. Confirm \`GET /api/health\` shows \`ready: true\` and \`cooling: 0\`.
3. If cooling persists, rotate or add keys in \`.env\` (\`GEMINI_API_KEY\` / \`GEMINI_API_KEYS\`) and restart the server.

---
*Light is Knowledge. Knowledge is Power. Honesty before illumination.*`;
  }

  if (reason === 'unreachable') {
    return `### BUBBLE UNREACHABLE — LINK DOWN

OPERATOR: The safe bubble health endpoint did not respond. Chat cannot invent a Guardian brief while the onboard line is dark.

**Next steps**
1. Confirm \`npm run dev\` (or the Vercel functions) is running.
2. Open \`/api/health\` and verify JSON with \`ok: true\`.
3. Check network / CSP / proxy — browser calls must stay same-origin to \`/api/*\`.

---
*Light is Knowledge. Knowledge is Power. Honesty before illumination.*`;
  }

  return `### BUBBLE OFFLINE — ONBOARDING REQUIRED

OPERATOR: \`GEMINI_API_KEY\` is not configured on the server. The console will **not** fabricate tactical briefs while the bubble is closed (no Potemkin enclave).

**Onboard line (complete these in order)**
1. Copy \`.env.example\` → \`.env\` (or \`.env.local\` for this machine).
2. Paste a Gemini key into \`GEMINI_API_KEY\`. Never use a \`VITE_\` prefix — that leaks into the browser bundle.
3. Optional failover: \`GEMINI_API_KEYS\` (comma-separated). Strategy: \`GEMINI_KEY_STRATEGY=failover\` or \`round-robin\`.
4. Restart \`npm run dev\` (or redeploy Vercel so Functions read the new env).
5. Verify \`GET /api/health\` returns \`ready: true\` and \`keys\` ≥ 1.
6. Resend your directive — Guardian replies only through the live bubble.

**Stripe (you manage the account)**  
Platform keys stay server-side when you wire Connect later: \`STRIPE_SECRET_KEY\`, \`STRIPE_PUBLISHABLE_KEY\`, \`STRIPE_WEBHOOK_SECRET\` in \`.env\` — never \`VITE_\`.

---
*Light is Knowledge. Knowledge is Power. Honesty before illumination.*`;
}

export function classifyBubbleFailure(message: string): 'unconfigured' | 'cooling' | 'other' {
  if (/not configured/i.test(message)) return 'unconfigured';
  if (/cooling down/i.test(message)) return 'cooling';
  return 'other';
}
