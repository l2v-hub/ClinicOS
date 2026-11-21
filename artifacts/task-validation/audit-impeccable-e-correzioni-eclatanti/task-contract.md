# Task Contract

## Task

- Title: Audit impeccable e correzioni eclatanti
- Slug: audit-impeccable-e-correzioni-eclatanti
- Type: change
- Date: 2026-11-21

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-21): «lancia la skill impeccable per fare un audit e
verifichiamo i punti segnalati senza stravolgere l'app ma sistemare le cose eclatanti». Solo
`frontend/src` (CSS e, se serve, attributi di accessibilità nei TSX). Nessuna modifica a backend,
Prisma, rotte, `VITE_API_URL`, sidebar L1, palette o struttura delle pagine.

## Current Behaviour

Dal task precedente (`coerenza-spaziature-e-menu-ingresso-paziente-rapidita-di-navigazione`,
PARTIAL) restano aperti: schede `TopNav level3` sottolineate e non a chip; tre livelli di titolo
nell'ingresso; finestre/moduli non verificati a schermo; regola residua `padding-bottom: 84px`. Non
è mai stato fatto un audit tecnico sistematico (accessibilità, contrasto, bersagli tattili, viste
strette) sulle pagine renderizzate.

## Expected Behaviour

Un report di audit secondo la guida `impeccable audit` (5 dimensioni, punteggio, problemi P0–P3
verificati sul rendering) e la correzione dei soli problemi eclatanti (P0/P1) senza cambiare
struttura, flussi o identità visiva.

## Acceptance Criteria

- AC1: report di audit in `report/audit.md` con punteggio per dimensione, problemi P0–P3 con file e
  impatto, falsi positivi scartati; misure da axe-core e Playwright sulle pagine principali
  (operatore e amministratore) a 1366px e 390px.
- AC2: ogni problema P0/P1 trovato è corretto oppure motivato come non correggibile senza
  stravolgere l'app; dopo le correzioni la nuova scansione non lo riporta più.
- AC3: i quattro punti aperti del task precedente hanno un esito scritto (corretto / lasciato per
  scelta, con motivo).
- AC4: sidebar invariata (0 pixel diversi) e nessuna pagina cambia struttura; schermate prima/dopo
  delle pagine toccate.
- AC5: `cd frontend && npm run build` passa, suite frontend passa, lint senza errori nuovi nei file
  toccati.

## Test Plan

| Test type                 | Required | Reason                                                |
| ------------------------- | -------: | ----------------------------------------------------- |
| Unit                      |      yes | suite frontend (test che vincolano CSS/TSX)           |
| Integration               |       no |                                                       |
| API                       |       no | backend non toccato                                   |
| Playwright                |      yes | scansioni axe, bersagli, sbordi, schermate prima/dopo |
| Persistence after refresh |       no | nessun flusso dati toccato                            |
| Agnos action registry     |       no |                                                       |
| Voice simulation          |       no |                                                       |
| OCR/import test           |       no |                                                       |
| Security/privacy scan     |       no | nessun dato o rete nuovi                              |

## Evidence Plan

Required evidence:

- validation-report.md
- `report/audit.md`
- `logs/` scansioni prima/dopo (axe, bersagli, sbordi), build, suite
- `screenshots/` prima/dopo delle pagine toccate

## Risks

- Il motore della skill non è stato eseguito (bloccato dai controlli della sessione): niente
  detector automatico; le misure vengono da axe-core e Playwright.
- Molti test vincolano il testo CSS: ogni correzione va verificata con la suite completa.

## Gate Status

READY FOR IMPLEMENTATION
