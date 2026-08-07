# Task Contract

## Task
- Title: Loop UX ciclo 6: preconnect ai domini Google Fonts
- Slug: loop-ux-ciclo-6-preconnect-ai-domini-google-fonts
- Type: refactor
- Date: 2026-08-07

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

`App.css` importa i font Google (Public Sans, JetBrains Mono) via `@import url('https://fonts.
googleapis.com/...')`. `index.html` non ha alcun hint di connessione: il browser scopre i domini
`fonts.googleapis.com` (CSS) e `fonts.gstatic.com` (file .woff2 referenziati da quel CSS) solo
dopo aver scaricato e parsato il bundle CSS, avviando la negoziazione DNS+TCP+TLS verso entrambi
in sequenza, sul percorso critico del primo render testuale. Item già identificato (AC6) nell'audit
grafica originale (Fase 1, mai implementata prima d'ora).

## Expected Behaviour

`<link rel="preconnect">` per entrambi i domini in `index.html`, cosi' la negoziazione DNS/TCP/TLS
parte in parallelo al download del bundle JS/CSS invece che dopo. Nessun cambiamento visivo:
stessi font, stesso `@import`, solo una connessione di rete gia' pronta quando serve.

## Acceptance Criteria

- AC1: `index.html` ha `<link rel="preconnect" href="https://fonts.googleapis.com">` e
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
- AC2: build di produzione include i tag nell'`<head>` (non solo nel sorgente dev).
- AC3: nessuna regressione visiva — verificato dal vivo che login/dashboard renderizzano coi
  font corretti (non un fallback di sistema).
- AC4: `tsc --noEmit`, `npm run build`, `npm test` puliti su frontend.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `npm test` non deve regredire. |
| Integration | no | |
| API | no | Nessuna route backend toccata. |
| Playwright | yes | Verifica che le richieste font vadano ai domini giusti e che la pagina renderizzi senza errori. |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `npm run build`, `npm test`)
- `dist/index.html` con i tag preconnect presenti
- screenshot della schermata di login con i font renderizzati correttamente

## Risks

- Il beneficio reale (tempo risparmiato sulla negoziazione DNS/TCP/TLS) dipende dalle condizioni
  di rete dell'utente finale (specialmente rilevante su tablet/rete clinica, il target dichiarato
  del design system) — non misurabile in modo rappresentativo con un test locale a bassa latenza
  in questa sessione; l'effetto atteso è basato sulla pratica standard documentata (preconnect
  elimina un round-trip di connessione dal percorso critico), non su un numero misurato qui.
- Cambiamento puramente additivo in `<head>`, nessuna logica applicativa toccata: rischio di
  regressione trascurabile.

## Gate Status

READY FOR IMPLEMENTATION
