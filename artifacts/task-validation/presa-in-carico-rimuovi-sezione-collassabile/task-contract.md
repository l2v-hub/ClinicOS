# Task Contract

## Task
- Title: Presa in carico rimuovi sezione collassabile
- Slug: presa-in-carico-rimuovi-sezione-collassabile
- Type: refactor
- Date: 2026-07-19

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

Il tab "Presa in carico" avvolge le 4 card (Dati di ingresso, Condizioni iniziali, Valutazione funzionale,
Documenti e firma) in un'unica `ClinicalTableSection` collassabile ("PRESA IN CARICO"). L'utente vuole
eliminare quella tabella/sezione contenitore e lasciare le card separate direttamente.

## Expected Behaviour

Rimosso il wrapper `ClinicalTableSection`: le 4 `ClinicalCard` sono renderizzate direttamente in
`.cr-tab-content` (sempre visibili, niente barra collassabile). Il pulsante Stampa resta accessibile.
Nessun cambio a logica/dati/API; EDIT e contenuto card invariati.

## Acceptance Criteria

- AC1: nessuna sezione collassabile "PRESA IN CARICO" attorno alle card; le 4 card sono separate e sempre visibili.
- AC2: pulsante Stampa ancora presente; contenuto/edit delle card invariato.
- AC3: nessun cambio logica/dati/API; `npm run build` verde.
- AC4: la tab "Sezioni Cliniche" (`.narrative-section`) usa lo stesso stile card di Presa in carico (bianca, raggio card, ombra soft, header con divisore) e resta modificabile inline per-sezione (solo CSS).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo markup presentazione |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot Presa in carico (niente barra collassabile, card separate) |
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
