<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Guardian Console

The operator UI is the AI Studio export: dashboard, telemetry, alerts, and the Guardian terminal. Chat, transcription, and speech still go through the server-side safe bubble. The Gemini key is never written into the browser bundle.

View your app in AI Studio: https://ai.studio/apps/drive/1hUe9O99hpOmvLO296utTmM9hICRC9SxV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Put a Gemini key in `.env` as `GEMINI_API_KEY`. Optional failover keys go in `GEMINI_API_KEYS`, comma-separated. `.env.local` overrides `.env` for this machine. Both files are gitignored. The key stays on the server and is not written into the browser bundle.
3. If a key was ever shipped in a browser bundle or pasted into git, revoke it in Google AI Studio and paste the replacement into `.env` only.
4. Run the app:
   `npm run dev`

The dev server listens on `127.0.0.1:3000`. Chat, transcription, and speech go through the local safe bubble. Datadog keys stay in the `DD_API_KEY` and `DD_APP_KEY` GitHub Actions secrets.
