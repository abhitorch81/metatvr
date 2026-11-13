# Deploying Gradient for the judges

The rules ask for a **public link** to the WebXR build that stays up until the winner announcement (about 11 Dec 2026). WebXR needs **HTTPS**.

Run `npm run check` first. It tests the agent and the production build.

## Option A: Vercel (recommended, because it also hosts the AI function)
1. Push `gradient-vr/` to its own GitHub repo (it should be the repo root so `api/` and `dist/` sit at the top).
2. In Vercel: New Project, import the repo. Framework: Vite. Build command `npm run build`, output `dist`.
3. Project Settings, Environment Variables: add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`). **Never commit the key.** `.env.local` is already gitignored.
4. Deploy. The app calls `/api/agent` on the same origin, so no extra setting is needed. Set `VITE_AGENT_URL` only if the function lives elsewhere.
5. Open the live URL in Quest Browser and press Enter VR. Build one level in Architect and check the log says "(OpenAI)".

If the function is down or has no key the game falls back to its local generator, so it never breaks.

## Option B: GitHub Pages (static only, no live OpenAI)
1. Push the repo to GitHub and enable Pages with the GitHub Actions source.
2. Use a standard Vite Pages workflow (`npm ci`, `npm run build`, upload `dist`). `vite.config.js` already uses `base: './'`.
3. The Architect will run in offline mode there. That is fine, but the OpenAI story only shows live on Vercel (or another host with a function).

## Before you submit
- [ ] Test the live link on a real Quest (hands only, no controllers). Check frame rate, pinch reliability and comfort.
- [ ] Confirm the link works logged out and in a private window.
- [ ] Re-run Architect with OpenAI on the live site; keep a screen recording as backup for the video.
- [ ] Do not change the site after submitting; the rules judge the state at the deadline.
- [ ] OpenAI cost: each design uses a few small requests. Set a spending limit on your OpenAI account.
