# Task Contract

## Task
- Title: Ricolora modale import dimissione con token
- Slug: ricolora-modale-import-dimissione-con-token
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

Il modale "Importa lettera di dimissione" (classi `.import-modal*` in `app-additions.css` ~6208–6560) è
strutturalmente corretto ma usa alcuni HEX hard-coded divergenti (#EFF4FE, #EEF3FE/#2F6BED, #FEF3F2/#B42318,
#BCD2FF, `var(--muted, #667085)`) invece dei token nuovi.

## Expected Behaviour

Solo valori CSS (nessun markup/logica). HEX divergenti agganciati ai token `var(--…)`: titolo `--text`;
muted `--text-muted`; back `--blue` + hover `--indigo-bg`; item hover `--hover`, idx `--blue`; select focus
`--blue`; progress `--indigo-bg`/`--blue`, spinner `--blue`/`--blue-dim`; errori `--red`/`--red-bg`; footer
Avvia = `.btn-primary` con ombra (scoped a `.import-modal__foot`), Annulla neutro, raggio 11px; card r18 +
ombra ampia; overlay `rgba(16,32,54,.55)`. Rosso solo per alert/errori.

## Acceptance Criteria

- AC1: nessun HEX divergente residuo nelle regole `.import-modal*` elencate; usano `var(--…)`.
- AC2: card `.import-modal` r18 + ombra ampia; overlay tint `rgba(16,32,54,.55)`; footer Avvia ombrato / Annulla neutro, raggio 11px.
- AC3: rosso solo per errori/alert; nessun cambio a markup/logica/API; stepper invariato e coerente.
- AC4: `cd frontend && npm run build` verde; screenshot del modale aperto vs mockup.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot modale import aperto vs mockup |
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
