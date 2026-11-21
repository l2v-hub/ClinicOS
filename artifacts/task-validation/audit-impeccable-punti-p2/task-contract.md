# Task Contract

## Task

- Title: Audit impeccable punti P2
- Slug: audit-impeccable-punti-p2
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

Note: richiesta dell'utente (2026-11-21): «Sistema anche i punti P2 dell'audit» (report
`artifacts/task-validation/audit-impeccable-e-correzioni-eclatanti/report/audit.md`, P2 n. 6–9),
nello stesso spirito del task precedente: senza stravolgere l'app. Solo `frontend/src`. Nessuna
modifica a backend, Prisma, rotte, `VITE_API_URL`, sidebar L1, palette o struttura delle pagine.

## Current Behaviour

- P2 n. 6: i badge storici (`agt-badge`, `letto-stato`, `alert-chip`, `cts__badge`, `badge--*`,
  `room-number-badge`, `assistant-id__badge`, `patient-roster-status`, `op-avatar-sm`) hanno colori
  esadecimali o di marca nel loro CSS d'origine; il task precedente li ha resi leggibili con un
  blocco di correzioni `:not(#ds)` sopra di loro, duplicando i toni di `ds-badge`.
- P2 n. 7: i menu inizio/fine degli Orari in modifica sono alti 32px (stile inline), contro i 44px
  canonici.
- P2 n. 8: nessun tema scuro.
- P2 n. 9: «Caricamento modulo…» compare per circa 280 ms alla prima visita di una pagina il cui
  modulo non è ancora scaricato.

## Expected Behaviour

- n. 6: un solo insieme di toni di stato (token `--ds-tone-*` su `:root`) usato da `ds-badge` e dai
  badge storici nel loro CSS d'origine; il blocco di correzioni sparisce; nessun esadecimale nei
  colori di quei badge. Aspetto invariato salvo differenze minime di tonalità dovute
  all'unificazione (stesso tono, stesso significato, contrasto ≥4.5:1).
- n. 7: menu degli orari all'altezza canonica `--ds-control-h`, impilati nella cella del giorno,
  senza stile inline.
- n. 8: non realizzato in questo task: è una decisione di prodotto (non chiesta dal brief) e un tema
  scuro su ~1.600 colori codificati sarebbe un rifacimento; resta segnalato come aperto.
- n. 9: il messaggio di caricamento non lampeggia nei caricamenti brevi: appare solo se l'attesa
  supera ~400 ms (lo spazio resta riservato, nessun salto).

## Acceptance Criteria

- AC1: nessun colore esadecimale né `var(--blue)`/`var(--amber)`/`var(--red)`/`var(--emerald)` come
  testo nei badge elencati; il blocco «Contrasto delle etichette piccole» in `design-system.css` è
  rimosso; `ds-badge` e badge storici leggono gli stessi token.
- AC2: scansione axe (amministratore e operatore, 1366px) senza nuove violazioni rispetto al
  task precedente; colori calcolati dei badge prima/dopo registrati, contrasto ≥4.5:1.
- AC3: i menu degli Orari in modifica misurano 44px di altezza e non sbordano dalla cella (1366 e
  390px); nessuno stile inline di altezza in `OperatorSchedule.tsx`.
- AC4: il fallback di caricamento resta invisibile (opacità 0) per i primi ~400 ms e poi appare;
  con `animation: none` resta visibile (nessun caso in cui sparisce del tutto).
- AC5: `cd frontend && npm run build` passa, suite frontend passa, lint senza errori nuovi; sidebar
  invariata (0 pixel diversi).

## Test Plan

| Test type                 | Required | Reason                                                 |
| ------------------------- | -------: | ------------------------------------------------------ |
| Unit                      |      yes | suite frontend + test nuovo che vincola token e badge  |
| Integration               |       no |                                                        |
| API                       |       no | backend non toccato                                    |
| Playwright                |      yes | axe, colori calcolati, altezza menu, fallback ritardato |
| Persistence after refresh |       no | nessun flusso dati toccato                             |
| Agnos action registry     |       no |                                                        |
| Voice simulation          |       no |                                                        |
| OCR/import test           |       no |                                                        |
| Security/privacy scan     |       no | nessun dato o rete nuovi                               |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` colori calcolati prima/dopo, scansioni axe, misure Orari, build, suite, lint
- `screenshots/` prima/dopo delle pagine toccate (Orari, Camere, Agenda, dashboard)

## Risks

- Molti test vincolano il testo CSS: verificare con la suite completa.
- L'unificazione dei toni sposta di poco alcune tinte (es. verde «LIBERO»): documentato con
  schermate.

## Gate Status

READY FOR IMPLEMENTATION
