# Task Contract

## Task
- Title: Scheda paziente phone tab e mini-card
- Slug: scheda-paziente-phone-tab-e-mini-card
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

Scheda paziente su phone (~390px): (1) i tab L2 (Panoramica/Clinica/Diario/Moduli/Documenti) e L3
(Riepilogo/Profilo/Consegne) sono grandi (pill 15px, padding ampio) e sforano orizzontalmente — gli ultimi
tab sono tagliati e si naviga male; (2) le mini-card riepilogo (`.cr-quick-stats`/`.cr-quick-stat`) sono
impilate a tutta larghezza (una per riga) → scroll verticale eccessivo.

## Expected Behaviour

Solo CSS. Su phone: (1) tab L2/L3 più compatti (font/padding ridotti) così più tab sono visibili e la barra
scorre in modo fluido; (2) mini-card riepilogo in **griglia a 2 colonne** compatta (val più piccolo) invece di
righe a tutta larghezza. Nessuna regressione desktop/tablet; nessun cambio a logica/dati/API.

## Acceptance Criteria

- AC1: su phone (≤600–640px) i tab L2 e L3 hanno padding/font ridotti; l'active pill non occupa eccessiva larghezza; la barra tab resta scorrevole senza tagliare in modo inutilizzabile.
- AC2: le mini-card riepilogo su phone sono in griglia a 2 colonne (compatte), non una per riga.
- AC3: nessun overflow orizzontale della pagina; nessuna regressione a desktop/tablet; nessun cambio logica/dati/API.
- AC4: `cd frontend && npm run build` verde; screenshot scheda paziente @390px di conferma.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot scheda paziente @390px (tab compatti + mini-card 2 colonne) |
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
