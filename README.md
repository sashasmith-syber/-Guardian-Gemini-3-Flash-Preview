<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Guardian Console

The operator UI is the AI Studio export: dashboard, telemetry, alerts, and the Guardian terminal. Chat, transcription, and speech still go through the server-side safe bubble. The Gemini key is never written into the browser bundle.

View your app in AI Studio: https://ai.studio/apps/drive/1hUe9O99hpOmvLO296utTmM9hICRC9SxV

## Run Locally

**Prerequisites:** Node.js 24.x and npm.


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` and a unique, random `GUARDIAN_OPERATOR_PASSWORD` (at least 32 bytes) in `.env`. Optional failover keys go in `GEMINI_API_KEYS`, comma-separated. `.env.local` overrides `.env` for this machine. Both files are gitignored. The Gemini key and operator password stay on the server; the browser asks for the password at sign-in and never includes it in the built bundle.
3. If a key was ever shipped in a browser bundle or pasted into git, revoke it in Google AI Studio and paste the replacement into `.env` only.
4. Run the app:
   `npm run dev`

The dev server listens on `127.0.0.1:3000`. Chat, transcription, and speech go through the local safe bubble after operator sign-in. The session cookie is HttpOnly, SameSite=Strict, and expires after eight hours; on local HTTP it is not marked Secure. Datadog keys stay in the `DD_API_KEY` and `DD_APP_KEY` GitHub Actions secrets.

## Deploy on Vercel

The Vite build is static (`npm run build`, output `dist/`). Vercel deploys `api/` as Node.js Functions and applies the response security headers in `vercel.json`.

The reviewed target is the existing Vercel project `guardian-gemini-3-flash-preview` (Vite, Node.js 24.x). Its observed Deployment Protection scope was `all_except_custom_domains`; re-check the live setting with the operator. Project/runtime metadata and Deployment Protection do not replace the application authentication below.

1. In the existing Vercel project, confirm the Vite framework preset, project root, and Node.js 24.x runtime. The generation, transcription, and TTS functions have a 60-second platform duration; Gemini requests time out after 40 seconds.
2. Add the following server-only variables under the Vercel project’s Environment Variables. Set values separately for Preview and Production; use distinct Gemini credentials for Preview when possible. Never add a `VITE_` prefix.
   - Required: `GEMINI_API_KEY`, `GUARDIAN_OPERATOR_PASSWORD`
   - Optional key rotation: `GEMINI_API_KEYS`, `GEMINI_KEY_STRATEGY`, `GEMINI_KEY_COOLDOWN_MS`
   - Optional limits: `BUBBLE_MAX_BODY_BYTES`, `BUBBLE_RATE_LIMIT`, `BUBBLE_RATE_WINDOW_MS`, `BUBBLE_AUTH_RATE_LIMIT`
3. Generate a unique operator password with at least 32 random bytes, keep it in your password manager, and distribute it only to authorized operators. Do not paste it into source, browser storage, issues, or logs.
4. Save the environment variables and let the existing Git integration build a Preview. Sign in through the console; then verify `GET /api/health` reports only whether the bubble is ready, and unauthenticated `POST /api/generate`, `/api/transcribe`, and `/api/tts` requests receive 401. API request bodies are capped by the configured limit and Vercel’s 4.5 MB request ceiling. Provider output is capped and each request has a 40-second timeout.
5. After reviewing the Preview, configure the same required variable names for Production and let the normal deployment workflow build it. Do not assume Vercel Deployment Protection authenticates custom domains: the application session is enforced independently. Check the project’s current Deployment Protection settings with the operator; this repository does not change those settings.

The application fails closed when `GUARDIAN_OPERATOR_PASSWORD` is missing or shorter than 32 bytes. `GET /api/health` is intentionally public and reveals only readiness; every provider operation requires the signed, HttpOnly operator session.

### Rollout, rollback, and remaining controls

- Roll out first to Preview with separate environment values. Confirm login, logout, session expiry, health, media requests, rate responses, and the absence of credentials from `dist/`.
- Promote through the existing production process only after operator review. To roll back, use Vercel’s normal rollback to the last known-good deployment and restore the corresponding server environment configuration. A rollback to a version without this application authentication removes that protection; restrict access with Vercel Deployment Protection/firewall controls before doing so.
- The process-local rate gate is bounded and useful as a per-instance backstop, not distributed abuse protection. Ask the operator to configure Vercel Firewall/WAF rate controls for the production API if available under the current plan; verify their coverage separately. No paid service or external rate-limit store is added here.
- This project has no GitHub App backend, installation flow, or webhook receiver, so no GitHub App permissions or webhook-signature checklist applies.
- If an operator password or Gemini key is exposed, revoke/replace it in the provider and update the Vercel environment through the approved operator workflow. This code cannot rotate provider credentials or validate Vercel account settings.

## Cloudflare Workers Builds (Previews)

`wrangler.jsonc` includes an empty `previews` block required by `npx wrangler preview`. In the Workers Builds settings for this service:

1. **Build command:** `npm run build` (writes Vite output to `dist/`)
2. **Deploy command:** `npx wrangler preview` (or `npm run cf:preview` if you prefer build+preview in one step)
3. Keep `GEMINI_API_KEY` as a build/runtime secret — never `VITE_`

Note: Vercel `api/` Functions are not Cloudflare Workers routes. A Preview serves the static console; chat still needs a Worker (or Vercel) bubble for `/api/*`.
