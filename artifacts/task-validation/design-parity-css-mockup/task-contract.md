# Task Contract

## Task
- Title: Design parity CSS mockup
- Slug: design-parity-css-mockup
- Type: refactor
- Date: 2026-07-17

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

Le classi CSS reali esistono e la struttura JSX è corretta, ma il trattamento visivo
(padding, font-size, border-radius, ombre, badge, stati hover/focus/active) diverge dai
valori del mockup approvato `design_handoff_restyle/ClinicOS RSA.html`. Alcune regole usano
HEX hard-coded divergenti invece dei token `var(--…)` di `clinicos-restyle.css`.

## Expected Behaviour

Le regole CSS delle classi mappate in `design_handoff_restyle/design-parity.md` combaciano
coi valori target del mockup, screen per screen (Dashboard, Lista pazienti, Parametri,
Consegne, Agenda, Wizard). HEX divergenti sostituiti da `var(--…)`. Rosso solo per alert
clinici. Nessuna modifica a markup/JSX, backend, API o logica. Solo `frontend/src/App.css`
e `frontend/src/app-additions.css` toccati. Build `npm run build` verde.

## Acceptance Criteria

- AC1: Per ogni sezione di `design-parity.md` (Dashboard, Lista pazienti, Parametri, Consegne/Agenda/Wizard) le regole CSS delle classi elencate combaciano coi valori target (padding, font-size, radius, ombre, badge, hover/focus/active).
- AC2: Gli HEX hard-coded divergenti sono sostituiti dai `var(--…)` di `clinicos-restyle.css`; il rosso resta riservato agli alert clinici; nessun uso di `!important` non giustificato.
- AC3: Nessuna modifica a markup/JSX, information architecture, backend, API, Prisma o logica; solo `App.css` e `app-additions.css` modificati.
- AC4: `cd frontend && npm run build` termina verde (tsc + vite build).
- AC5: Regressione visiva (screenshot Playwright) delle schermate indicate senza layout rotti; banda allergie ed evidenze soglie parametri corrette.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo modifiche CSS, nessuna logica |
| Integration | no | Nessun cambio di integrazione |
| API | no | Backend non toccato |
| Playwright | yes | Regressione visiva screen-by-screen (screenshot evidenze) |
| Persistence after refresh | no | Nessun dato creato/modificato |
| Agnos action registry | no | Non impattato |
| Voice simulation | no | Non impattato |
| OCR/import test | no | Non impattato |
| Security/privacy scan | no | Nessun dato/secret toccato |

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
