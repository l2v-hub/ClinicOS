# Task Contract

## Task
- Title: ClinicOS portable skill
- Slug: clinicos-portable-skill
- Type: config
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

La skill esistente contiene un briefing con percorsi locali, conteggi e assunzioni di deploy non portabili.

## Expected Behaviour

Skill canonica portabile con playbook completo e ingresso .agents, senza cambiare applicazione, controller o stato issue.

## Acceptance Criteria

- AC1: Pacchetto clinicos autocontenuto SKILL.md + references, riferimenti locali risolvibili e ingresso .agents corretto.
- AC2: Copre aggregazione, analisi end-to-end, scope/worktree autorizzati, modelli adattivi e quattro cicli senza reset.
- AC3: Preserva QA indipendente, prove per issue e SHA, isolamento QA, review Claude e chiusura solo dopo release verificata.
- AC4: Nessun segreto, PHI, modifica runtime o istruzione che aggiri protezioni; documentazione conforme ai moduli correnti.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | no | |
| API | no | |
| Playwright | yes | Rendering reale skill e navigazione playbook in superficie QA isolata |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Sicurezza istruzioni, assenza segreti/PHI e nessun bypass |

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

Rischio istruzioni obsolete: confronto indipendente con workflow e skill correnti. Nessun test su database/app remoti. La pubblicazione della skill non risolve i blocchi clinici già aperti.

## Gate Status

READY FOR IMPLEMENTATION
