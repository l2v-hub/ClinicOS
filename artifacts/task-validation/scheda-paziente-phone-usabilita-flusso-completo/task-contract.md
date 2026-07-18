# Task Contract

## Task
- Title: Scheda paziente phone usabilita flusso completo
- Slug: scheda-paziente-phone-usabilita-flusso-completo
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

Su phone, entrando nella scheda paziente dal flusso reale (Pazienti → tap paziente → scheda), la pagina
non è utilizzabile su uno o più tab. Da individuare con audit: `.patient-record-view` è uno stack verticale
(header + banda sicurezza + TopNav L2 + L3 + `.cr-tab-content`); il problema è probabilmente su tab non-Panoramica
(Clinica/Diario/Moduli/Documenti) o su form/tabelle/editor che sforano o non sono usabili a ~390px.

## Expected Behaviour

Solo CSS (salvo micro-deroga markup se indispensabile). La scheda paziente è utilizzabile a phone (~360–430px)
su TUTTI i tab: niente contenuto tagliato/irraggiungibile, form/tabelle/editor leggibili e interagibili,
nessun overflow orizzontale della pagina, controlli raggiungibili. Nessuna regressione desktop/tablet.

## Acceptance Criteria

- AC1: nessun overflow orizzontale della pagina su tutti i tab della scheda paziente a 360/390px.
- AC2: contenuti dei tab (Panoramica/Clinica/Diario/Moduli/Documenti) e relativi L3/editor leggibili e usabili su phone (niente elementi tagliati/irraggiungibili, controlli raggiungibili).
- AC3: nessuna regressione desktop/tablet; nessun cambio a logica/dati/backend/API.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | yes | Screenshot scheda paziente tutti i tab @360/390 | |
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
