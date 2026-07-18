# Task Validation Report

## Task
- Title: Fix vercel SPA rewrite escludi assets chunk MIME error
- Slug: fix-vercel-spa-rewrite-escludi-assets-chunk-mime-error
- Commit: (push in corso)
- Date: 2026-07-18

## Implementation Summary

`frontend/vercel.json`: rewrite SPA da catch-all `"/(.*)" → "/index.html"` a
`"/((?!assets/).*)" → "/index.html"`. Gli asset statici (`/assets/*`) sono esclusi dal fallback SPA:
i chunk esistenti restano serviti dal filesystem, i chunk mancanti (hash stale dopo redeploy) danno un
**404 pulito** invece di `index.html` con MIME `text/html` → sparisce l'errore "Failed to load module script".
Le route SPA continuano a fare fallback su index.html. Nessun cambio a codice applicativo/backend/API.

## Files Changed

- `frontend/vercel.json`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — rewrite = `{ "source": "/((?!assets/).*)", "destination": "/index.html" }` | PASS | `vercel.json` aggiornato; rewrites verificati |
| AC2 — JSON valido; build verde; nessun cambio codice app/backend | PASS | `JSON.parse` ok; `npm run build` exit 0; toccato solo vercel.json |
| AC3 — post-deploy: chunk mancante → 404 (non text/html); route SPA ok | NOT VERIFIED | verificabile solo dopo redeploy prod (comportamento deterministico dal rewrite) |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| JSON valid | PASS | `node JSON.parse` ok |
| Build (tsc + vite) | PASS | build exit 0 |
| Runtime 404 su chunk mancante | NOT VERIFIED | richiede redeploy prod |
| Security/privacy | PASS | solo config rewrite, nessun secret |

## Runtime Evidence

- Config diff (`frontend/vercel.json`): rewrites = `[{ "source": "/((?!assets/).*)", "destination": "/index.html" }]`

## Logs

N/A (config).

## Residual Risks

- **Il fix ha effetto solo dal deploy successivo.** Finché non si fa `vercel deploy --prod`, la produzione
  resta col rewrite vecchio. Workaround immediato per l'utente sul deploy attuale: **hard reload**
  (Ctrl+Shift+R) per prendere l'`index.html` corrente coi chunk coerenti.
- Miglioria opzionale futura (non in questo task): gestire lato client il fallimento di un dynamic import
  (reload one-shot) per i tab rimasti aperti durante un redeploy.

## Final Decision

IMPLEMENTED — NOT VERIFIED

(Config corretta, JSON valido, build verde. La verifica runtime (404 su chunk mancante) richiede un redeploy
prod: eseguibile solo con `vercel deploy --prod`. In attesa di autorizzazione al deploy.)
