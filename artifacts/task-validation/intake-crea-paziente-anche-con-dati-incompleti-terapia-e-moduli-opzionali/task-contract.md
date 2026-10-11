# Task Contract

## Task
- Title: Intake: crea paziente anche con dati incompleti (terapia e moduli opzionali)
- Slug: intake-crea-paziente-anche-con-dati-incompleti-terapia-e-moduli-opzionali
- Type: change
- Date: 2026-10-03

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

Crea paziente è disabilitato finché non si confermano anagrafica e terapia.

## Expected Behaviour

Si crea con solo nome e cognome validi; conferme, terapia, moduli e dati mancanti sono note non bloccanti.

## Acceptance Criteria

- AC1: con solo nome e cognome «Crea paziente» è abilitato
- AC2: valori non validi e proposte d'import pendenti bloccano ancora
- AC3: l'elenco «Dati non completi» mostra cosa manca

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | intakeProgress |
| Integration | no | |
| API | no | |
| Playwright | no | |
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
