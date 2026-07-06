# Task Contract

## Task
- Title: 224 no secret frontend bundle scan
- Slug: 224-no-secret-frontend-bundle-scan
- Type: change
- Date: 2026-07-06
- GitHub Issue: #224 (No secret frontend e scansione bundle, p0, parent #167)

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
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

Il frontend NON referenzia variabili d'ambiente segrete (solo `VITE_API_URL`, non sensibile — verificato
via grep su `frontend/src`). Tuttavia **non esiste** né uno script né un gate CI che rilevi pattern di
segreti o l'inlining accidentale di un `VITE_*` sensibile nel bundle. Senza un controllo automatico, una
futura PR potrebbe introdurre una chiave provider nel frontend (che Vite inlina in chiaro nel bundle).

## Expected Behaviour

- Esiste uno script portabile (Node, senza dipendenze nuove) che scandisce sorgenti frontend e, quando
  presente, il bundle buildato, rilevando pattern di segreti comuni e riferimenti a env var sensibili;
  esce con codice != 0 se trova qualcosa.
- Un job CI esegue lo script su PR/push che toccano il frontend, buildando e scandendo anche `dist/`.
- Prova (grep/scan) allegata che il frontend attuale è pulito.

## Acceptance Criteria

- AC1: Secret-like env vars are not referenced by frontend — verificato dallo scan (0 match) su `frontend/src`.
- AC2: Bundle/grep proof is attached — output dello scan salvato in evidenza; il CI scandisce il bundle `dist/`.
- AC3: CI or script detects common secret patterns — script con pattern (provider keys, private keys, env segrete) + job CI che fallisce su match.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Lo script E' il controllo; testato via self-check (fixture positiva/negativa) |
| Integration | no | |
| API | no | |
| Playwright | no | Nessuna modifica UI (boilerplate "Required" non pertinente: nessun runtime UI toccato) |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | E' l'oggetto del task |

## Evidence Plan

- validation-report.md
- output scan su `frontend/src` (pulito) -> `logs/`
- self-check dello script su una fixture con segreto finto -> dimostra che rileva (exit 1) -> `logs/`
- workflow CI aggiunto (`.github/workflows/frontend-secret-scan.yml`)

## Risks

- Falsi positivi (hash/base64 scambiati per chiavi). Mitigazione: pattern mirati a formati provider noti +
  scoping a `frontend/src`/`dist`, con meccanismo di allowlist via commento `secret-scan-ignore`.
- Falsi negativi. Mitigazione: coprire i formati più comuni + riferimenti a nomi di env server segreti.

## Gate Status

READY FOR IMPLEMENTATION
