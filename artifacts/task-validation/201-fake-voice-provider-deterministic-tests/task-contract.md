# Task Contract

## Task
- Title: 201 fake voice provider deterministic tests
- Slug: 201-fake-voice-provider-deterministic-tests
- Type: change
- Date: 2026-07-06
- GitHub Issue: #201 (Test provider voce fake, p0, parent #164)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | yes |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

L'audio è trascritto CLIENT-SIDE (Web Speech API); non raggiunge il backend. Lato server esiste solo un
livello di *capability/degradazione* STT: `sttStatus(cfg)` (`voice/config.ts`) riporta l'intento configurato
(`AI_STT_MODEL` presente → available; assente → degraded). La verifica reale delle capability è demandata
"al runtime" e **non è testabile in modo deterministico**: non esiste un'astrazione provider né un doppio di
test per simulare success/failure/timeout senza credenziali reali.

## Expected Behaviour

Esiste una seam `VoiceSttProvider` (probe delle capability STT) con un doppio di test configurabile
`FakeVoiceSttProvider` (success / failure / timeout) e un helper `probeSttStatus(provider, cfg, {timeoutMs})`
che mappa l'esito del probe in `SttStatus` (available oppure degraded+reason su capability mancanti / errore /
timeout). Nessuna modifica al runtime/route esistente. Test deterministici, senza credenziali.

## Acceptance Criteria

- AC1: Tests do not require live provider credentials — i test usano solo `FakeVoiceSttProvider`, nessun env segreto.
- AC2: Fake provider covers success/failure/timeout — il fake ha 3 modalità e i test coprono ognuna.
- AC3: No secrets are needed in CI — test unit puri, nessun segreto; nessuna chiamata di rete.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Nuovo `voice-provider.test.ts`: probeSttStatus con fake in success/failure/timeout + capability mancanti |
| Integration | no | |
| API | no | Nessuna modifica route |
| Playwright | no | Nessuna UI |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | yes | Il fake È il provider voce simulato |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

- validation-report.md
- output `voice-provider.test.ts` verde → test-results/
- conferma non-regressione: nuovo file registrato nella lista `backend/package.json`

## Risks

- Rischio: timeout test flaky. Mitigazione: fake in modalità timeout non-risolvente + `timeoutMs` piccolo e
  deterministico; l'helper usa una race con timer che rigetta per primo.
- Rischio: over-engineering (seam non usata a runtime). Mitigazione: superficie minima, nessuna modifica al
  comportamento runtime; la seam serve i test ora e il wiring runtime futuro (#195/#198).

## Gate Status

READY FOR IMPLEMENTATION
