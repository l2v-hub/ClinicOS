---
name: clinicos-deploy-mechanics
description: 'How ClinicOS deploys — frontend Vercel (manual), backend Railway (auto on merge) — plus the vercel SPA rewrite + auth-wall gotchas'
metadata:
  node_type: memory
  type: reference
  originSessionId: 7a45fd8d-9aea-4836-82a8-521a0c24281f
---

- **Frontend (Vercel)** — deploy manually from repo root: `vercel deploy --prod --archive=tgz --yes` (call the global `vercel` binary; `npx vercel` gets rewritten to `npm` by a shell hook). Prod project `clinicos__`, alias `clinicos-eosin.vercel.app`. A `--prod` deploy auto-promotes the alias. Push to `main` does NOT auto-deploy the frontend — it's manual.
- **Backend (Railway)** — deploys AUTOMATICALLY via GitHub Actions `.github/workflows/deploy-backend.yml` on merge/push to `main`. Merging a backend PR triggers "Deploy Backend to Railway" + "AI Import E2E Gate" runs (watch with `gh run watch <id> --exit-status`). Backend URL: `clinicos-backend-production-df88.up.railway.app` (`/health`, `/patients`). Railway CLI needs a valid `RAILWAY_TOKEN` (usually not set in session).
- **vercel.json SPA rewrite gotcha (fixed):** `frontend/vercel.json` catch-all `/(.*)→/index.html` served `index.html` (text/html) for missing hashed chunks after a redeploy → "Failed to load module script … MIME type text/html". Now `"/((?!assets/).*)"` excludes `/assets/` so a stale chunk 404s cleanly. Don't re-broaden it.
- **Auth wall:** prod is behind Entra/OIDC — anonymous `curl` to `clinicos-eosin.vercel.app` returns 403 (auth page). Can't verify prod pages by curl; rely on LOCAL Playwright + ask the user to hard-reload (Ctrl+Shift+R) authenticated.
- **User cadence:** they say "deploy"/"deploia" explicitly after each verified fix; then I run the Vercel command. Don't auto-deploy without that word. Run `npx`→`npm` hook means test binaries need direct paths, e.g. `../node_modules/.bin/tsx --test <file>` from `backend/`.

Related: [[clinicos-mobile-responsive-gotchas]], [[clinicos-restyle-tokens-and-import-gotcha]].
