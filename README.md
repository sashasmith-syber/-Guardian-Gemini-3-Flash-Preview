<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Guardian Strategist V3.0

AI Studio app with **server-side Gemini proxy** — the API key stays on the Vite server and is **not** injected into the browser bundle.

View in AI Studio: https://ai.studio/apps/6c7bd6f5-037a-405c-b443-43217a637845

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` → `.env.local` and set `GEMINI_API_KEY` (server-only; never use a `VITE_` prefix).
3. Run the app:
   `npm run dev`  
   Dev server binds to `127.0.0.1:3000` only.
4. Quality checks:
   - `npm run lint`
   - `npm test`

## Hardening notes

- Client calls `/api/guardian/generate|transcribe|tts` — key never ships in JS.
- If the key is missing, the console falls back to the local sovereign persona engine.
- Optional model overrides: `GEMINI_CHAT_MODEL`, `GEMINI_TRANSCRIBE_MODEL`, `GEMINI_TTS_MODEL`.

## AI Studio caveat

Re-exporting / reopening the project in Google AI Studio can rewrite Vite config and re-inject keys into the client. After Studio sync, re-check `vite.config.ts` still has **no** `define` of `GEMINI_API_KEY` and still uses `guardianProxyPlugin`.
