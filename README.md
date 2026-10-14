<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hUe9O99hpOmvLO296utTmM9hICRC9SxV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env` and set `GEMINI_API_KEY`. Add more keys in `GEMINI_API_KEYS` when you want rotation. The key stays on the server and is not written into the browser bundle.
3. Run the app:
   `npm run dev`
