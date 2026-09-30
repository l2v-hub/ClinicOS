# Task Validation Report

## Task

- Title: Diary therapy preview AI fallback
- Slug: diary-therapy-preview-ai-fallback
- Commit: 59f7afdd (PR #384, rebase-merged on main)
- Date: 2026-09-30

## Implementation Summary

`POST /patients/:id/diary/therapy-preview` still runs the deterministic interpreter first. Only when
it leaves drug, dose or times empty for a prescription, the backend asks the AI runtime for a
text-only extraction (JSON Schema, `gpt-6.1-sol`, same `/v1/document-jobs` contract as the document
pipeline, no files). The proposal is validated (HH:MM times, route codes, ISO dates), fills ONLY
empty fields, fascia conflicts are recomputed, the row stays `da_verificare`, and the response adds
`aiFields`, `aiNotes` (typo corrections / doubts) and the `proposta_ai` warning. Runtime failure or
45 s timeout → deterministic preview + `ai_non_disponibile`. Kill switch `DIARY_THERAPY_AI=off`.
Frontend shows "Proposti dall'AI: …", each AI note, and the outage notice.

## Files Changed

- backend/src/therapies/diary-therapy-ai.ts (new)
- backend/src/therapies/**tests**/diary-therapy-ai.test.ts (new)
- backend/src/patients/diary-write-service.ts (previewDiaryTherapy async + injectable proposer)
- backend/src/routes/patient-diary.ts (async handler)
- backend/src/therapies/diary-therapy-parse.ts (warning union)
- frontend/src/components/operator/cartella/diaryTherapy.ts (+ test)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Demo backend (deployed 59f7afdd), user's exact text: 200 in 3.6 s, source `deterministic+ai`, TACHIPIRINA / 1000 mg / 00:00-08:00-16:00, `da_verificare`, aiFields farmaco+dosaggio+orari, aiNote "techipirina → TACHIPIRINA". Unit test AC1.                                                                                                                                                                                             |
| AC2 |   PASS | Unit tests "deterministic fields are never overwritten", "invalid AI values are discarded".                                                                                                                                                                                                                                                                                                                                               |
| AC3 |   PASS | Unit test (proposer returns null / throws → 200 deterministic + `ai_non_disponibile`). Not provoked on the deployed env (would require taking the shared runtime down).                                                                                                                                                                                                                                                                   |
| AC4 |   PASS | Unit test + demo: "Sospendere Ramipril 5 mg" and "Ramipril 5 mg ore 8" → source `deterministic`, 0.3 s (no AI call).                                                                                                                                                                                                                                                                                                                      |
| AC5 |   PASS | Backend suite on local embedded Postgres: 33 failures, all in files already failing on the main baseline; CI `gate` 19 failures identical to main run 36699759660 (diffed by name). Frontend 961/970, the 9 failures in 4 files that do not reference the diary. Frontend `npm run build` OK, backend build OK, tsc OK. Prod backend deploy run 36701671278 green, Vercel production success on 59f7afdd, demo deployed via `railway up`. |

## Test Results

| Test             | Result | Evidence                                                                                                                                   |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit             |   PASS | backend diary-therapy-ai.test.ts 8/8; frontend diaryTherapy.test.ts 20/20                                                                  |
| Integration      |   PASS | service-level tests call `previewDiaryTherapy` (the exact function the route awaits) with an injected proposer; route contract tests green |
| API              |   PASS | demo backend, see Runtime Evidence                                                                                                         |
| Playwright       |     NA | per contract                                                                                                                               |
| Persistence      |     NA | read-only preview                                                                                                                          |
| Agnos AI         |     NA |                                                                                                                                            |
| Voice            |     NA |                                                                                                                                            |
| OCR              |     NA |                                                                                                                                            |
| Security/privacy |   PASS | no console/logger in new code; diary text only in the runtime request body; route block still has no `prisma.`/`console.` (contract test)  |

## Runtime Evidence

```
status 200 time 3.56s | source deterministic+ai | intent prescrizione | farmaco TACHIPIRINA | dosaggio 1000 mg | orari ["00:00","08:00","16:00"] | stato da_verificare | warnings ["proposta_ai"] | aiFields ["farmacoNome","dosaggio","orari"] | aiNotes ["techipirina → TACHIPIRINA"] | fasce []
status 200 time 0.32s | source deterministic | intent sospensione (Sospendere Ramipril 5 mg)
status 200 time 0.34s | source deterministic | RAMIPRIL 5 mg ["08:00"] (Ramipril 5 mg ore 8)
status 200 time 3.99s | source deterministic+ai | PARACETAMOLO 500 mg ["00:00","06:00","12:00","18:00"] (Paracetamolo 500mg ogni 6 ore dalle 6)
```

## Logs

Only sanitized logs are allowed. No secrets printed; synthetic texts only.

## Residual Risks

- Latency ~4 s when the AI is used (bounded at 45 s, then deterministic fallback).
- Production backend: the preview is reachable only after the user's frontend hard reload.

## Final Decision

CLOSED — VERIFIED
