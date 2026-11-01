# Security

Guardian Console keeps Gemini credentials on the server. The browser calls `/api/session`, `/api/generate`, `/api/transcribe`, `/api/tts`, and `/api/health`. Provider operations require a signed, eight-hour, HttpOnly, SameSite=Strict session. The operator password is verified server-side and is never compiled into the browser bundle.

## Reporting

Open a private GitHub security advisory for this repository. Do not paste API keys, `.env` contents, or Datadog secrets into issues, pull requests, or chat logs.

## Key handling

- Put Gemini keys in `.env` or `.env.local`. Both files are gitignored.
- Configure `GEMINI_API_KEY` and a unique `GUARDIAN_OPERATOR_PASSWORD` of at least 32 bytes in `.env` or the Vercel project environment. The browser prompts for the operator password; it is not stored in local storage or embedded in the bundle.
- On Vercel, use Preview and Production environment scopes deliberately. The `api/` functions read server-side variables only. A `VITE_` prefix would ship a value to the browser.
- `.env.example` is the only env file that belongs in git, and its key fields stay empty.
- Never prefix a Gemini key with `VITE_`.
- The bubble drops a key from rotation after an authentication or quota failure until `GEMINI_KEY_COOLDOWN_MS` elapses.
- Revoke a key in Google AI Studio when it may have been exposed, then replace the value in `.env`.
- Store `DD_API_KEY` and `DD_APP_KEY` as GitHub Actions secrets and rotate them in Datadog.

## Request controls and limits

Provider routes require a valid session and same-origin JSON requests under the request-size limit. Image and audio types are allow-listed, payload schemas reject unknown fields, and media have an encoded-size cap. Gemini requests time out after 40 seconds and have bounded output tokens. API errors are generic; server logs redact configured secrets and common token forms.

The sliding-window rate gate is process-local, with bounded client state. Vercel instances do not share that state, so it is only a best-effort per-instance control, not distributed abuse prevention. Operators should independently configure and verify Vercel Firewall/WAF rate controls for API routes when available. CORS/origin checks and this in-memory gate are not substitutes for authentication or platform-level abuse controls.

`GET /api/health` is intentionally public and reports only readiness; it does not reveal key counts or key strategy. The production Vercel response headers, including CSP and HSTS, are in `vercel.json`. Confirm the live project settings and headers during rollout—this repository cannot verify or change Vercel authentication scope or Firewall configuration.

This repository does not implement a GitHub App, webhook receiver, or GitHub API integration. Do not grant GitHub App permissions or configure webhook secrets for this application unless such an integration is added and reviewed later.

## Rollout and recovery

Test a Preview using separate credentials before Production. Confirm authenticated/unauthenticated API behavior, session expiration, size rejection, provider timeouts, CSP, and that no credentials appear in `dist/`. If credentials are exposed, revoke them with the relevant provider and update server-side environment configuration. A Vercel rollback to a revision predating application sessions also removes this protection; use Vercel Deployment Protection/firewall controls before rolling back to such a revision.
