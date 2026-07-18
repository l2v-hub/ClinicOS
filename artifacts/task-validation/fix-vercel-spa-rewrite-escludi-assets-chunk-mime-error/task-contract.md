# Task Contract

## Task
- Title: Fix vercel SPA rewrite escludi assets chunk MIME error
- Slug: fix-vercel-spa-rewrite-escludi-assets-chunk-mime-error
- Type: bugfix
- Date: 2026-07-18

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | yes |

## Current Behaviour

In produzione (clinicos-eosin.vercel.app) i chunk lazy (`ParametriTab-*.js`, `ScalaNRSTab-*.js`) falliscono con
"Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a
MIME type of text/html". Causa: `frontend/vercel.json` ha un rewrite catch-all `"/(.*)" → "/index.html"` che
cattura ANCHE le richieste `/assets/*.js`: quando un tab con `index.html` vecchio richiede un chunk con hash
non più esistente (dopo un redeploy), Vercel serve `index.html` (200, text/html) invece di un 404 → il module
loader del browser rifiuta il MIME.

## Expected Behaviour

Il rewrite SPA esclude gli asset statici: `"/((?!assets/).*)" → "/index.html"`. Così i chunk esistenti sono
serviti dal filesystem, i chunk mancanti restituiscono **404 pulito** (niente index.html con MIME sbagliato),
e le route SPA continuano a fare fallback su index.html. Nessun cambio a codice app/backend/API. Il fix ha
effetto dal deploy successivo (serve un redeploy prod + hard reload lato utente).

## Acceptance Criteria

- AC1: `frontend/vercel.json` rewrite = `{ "source": "/((?!assets/).*)", "destination": "/index.html" }` (asset esclusi).
- AC2: JSON valido; `cd frontend && npm run build` verde; nessun cambio a codice applicativo/backend/API.
- AC3: dopo redeploy, una richiesta a un `/assets/<chunk>.js` inesistente restituisce 404 (non text/html index.html); le route SPA continuano a funzionare.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Config deploy |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | no | Verificabile solo post-deploy (404 su chunk mancante); build locale + validazione JSON |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Nessun secret |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
