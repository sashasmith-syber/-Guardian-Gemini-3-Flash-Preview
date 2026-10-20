# Security

Guardian Console keeps Gemini credentials on the server. The browser talks only to `/api/generate`, `/api/transcribe`, `/api/tts`, and `/api/health`.

## Reporting

Open a private GitHub security advisory for this repository. Do not paste API keys, `.env` contents, or Datadog secrets into issues, pull requests, or chat logs.

## Key handling

- Put Gemini keys in `.env` or `.env.local`. Both files are gitignored.
- On Vercel, put the same names in the project environment. The `api/` functions read them on the server. A `VITE_` prefix would ship the key to the browser.
- `.env.example` is the only env file that belongs in git, and its key fields stay empty.
- Never prefix a Gemini key with `VITE_`.
- The bubble drops a key from rotation after an authentication or quota failure until `GEMINI_KEY_COOLDOWN_MS` elapses.
- Revoke a key in Google AI Studio when it may have been exposed, then replace the value in `.env`.
- Store `DD_API_KEY` and `DD_APP_KEY` as GitHub Actions secrets and rotate them in Datadog.

## What the bubble checks

Requests must be same-origin JSON under the size limit. Image and audio types are allow-listed. Logs pass through redaction before they are printed. The dev server binds to loopback unless `HOST` is set.
