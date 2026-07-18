# Task Contract

## Task
- Title: Scheda presa in carico view restyle
- Slug: scheda-presa-in-carico-view-restyle
- Type: refactor
- Date: 2026-07-18

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

Tab "Presa in carico" (`PresaInCaricoTab`) — la modalità VIEW è mal impaginata (l'EDIT va bene):
(BLOCKER) su phone i valori `.pic-row__val` sono tagliati (`.pic-row__lbl min-width:168px` + right-align +
`.clinical-card overflow:hidden`); (HIGH) card-in-card (`.cr-form-section` card dentro `.clinical-card`);
(HIGH) allineamento valori incoerente (statici a destra, inline-editable a sinistra); (MED) righe troppo
ariose (gap:14px + padding+divider); (MED) banner "Presa in carico non ancora compilata" mostrato SOPRA card
già popolate coi default → sembra rotto.

## Expected Behaviour

Prevalentemente CSS + micro-markup: VIEW impaginata come lista pulita di righe in un'unica card (niente
card-in-card), valori allineati coerentemente, righe compatte con divisore, nessun taglio su phone (righe
impilate label/valore), banner empty-state contraddittorio rimosso. EDIT invariato. Nessun cambio a
logica/dati/API.

## Acceptance Criteria

- AC1: nessun valore tagliato/illeggibile nella VIEW su phone (≤640px): righe impilano label/valore, min-width label rimosso.
- AC2: niente card-in-card: `.cr-form-section` dentro `.clinical-card` è un contenitore trasparente (no bordo/ombra/padding doppio); righe compatte (no gap che spezza il divisore).
- AC3: valori allineati in modo coerente (statici e inline-editable sullo stesso asse); banner empty-state contraddittorio rimosso.
- AC4: nessuna regressione EDIT/desktop; nessun cambio logica/dati/API; `npm run build` verde; screenshot VIEW desktop+phone.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS/markup presentazione |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot Presa in carico VIEW desktop+phone (no card-in-card, no taglio, allineamento) |
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
