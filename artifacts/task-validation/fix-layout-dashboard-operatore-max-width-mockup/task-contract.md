# Task Contract

## Task
- Title: Fix layout dashboard operatore max-width mockup
- Slug: fix-layout-dashboard-operatore-max-width-mockup
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

`App.css` ha regole `.operator-dashboard` in conflitto: `max-width: 1040px` (~2830) e, più in basso nel
gruppo "fill desktop", `max-width: none` (~4250) che vince → il contenuto va a tutta pagina, diverso dal
mockup centrato. Stesso schema su altre viste operatore (`.patient-list-view` 1040, `.operator-agenda-view`
900) sovrascritte a `none`. KPI card / griglie / progress card erano già allineate al mockup (commit a45a7dd).

## Expected Behaviour

Solo CSS. Viste operatore (Dashboard, Pazienti/Parametri, Consegne, Agenda) con contenitore centrato
`max-width: 1400px; margin: 0 auto;` — rimosse dal gruppo `max-width: none` e regole per-vista riallineate
così non si contraddicono. `.patient-detail` e viste admin restano invariate. KPI/griglie/progress verificate:
`.kpi-alert-card` senza border-left (stato colora icona-pastiglia + numero), padding 20/22, border, r16, ombra,
`__val` 38/800, label 14/600 muted; `.kpi-alert-grid` 4 col / `.stats-grid` 3 col gap 18 mb 24, altezze uniformi;
progress card padding 20/22, barra h9 fill gradient. Nessun markup/logica/API.

## Acceptance Criteria

- AC1: nessun conflitto `max-width` su `.operator-dashboard`; le viste operatore (dashboard, pazienti/parametri, consegne, agenda) sono `max-width: 1400px; margin: 0 auto;` e non a tutta pagina.
- AC2: `.kpi-alert-card` senza bordo-sinistro colorato; padding 20/22, border, r16, ombra; `__val` 38/800; label 14/600 muted; nessuna altezza fissa con vuoti.
- AC3: `.kpi-alert-grid` 4 col / `.stats-grid` 3 col, gap 18, mb 24, card stessa riga stessa altezza; progress card padding 20/22, barra h9 gradient.
- AC4: `cd frontend && npm run build` verde; screenshot dashboard @1440px confrontato col mockup (contenuto centrato, non full-bleed).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot dashboard @1440px vs mockup (max-width centrato) |
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
