# Task Validation Report

## Task

- Title: Phase 6 clinical safety guardrails
- Slug: phase-6-clinical-safety-guardrails
- Commit: (branch feat/phase6-safety — see PR)
- Date: 2026-10-01

## Implementation Summary

Prompt 6 loop THREAT MODEL → TEST → FIND GAP → MINIMAL FIX → RETEST → REGRESSION. 18 gaps
fixed with minimal changes (no architecture rewrite, no Prisma model change; one SQL migration
adding append-only triggers to `AiAuditEvent`). Details: `.ai-architecture/phase-6-safety/CURRENT_STATE.md` §2.

## Files Changed

- Backend: `ai/gateway/query/engine.ts`, `routes/patient-documents.ts`, `skills/executors.ts`,
  `lib/idempotency.ts` (new), `routes/patient-therapies.ts`, `routes/patient-diary.ts`,
  `ai/audit-store.ts`, `patients/diary-write-service.ts`, `tools/capabilities/diary.ts`,
  `tools/registry.ts`, `authz/route-gate.ts`, `ai/untrusted-prompt.ts` (new),
  `ai/upload/job-service.ts`, `therapies/diary-therapy-ai.ts`, `ai/assistant/composer.ts`,
  `app.ts`, `lib/async-guard.ts` (new), `skills/http.ts`, `server.ts`, `routes/ai-extraction.ts`,
  `routes/intake-drafts.ts`, `skills/interpreter.ts`, `patients/parameter-reading-input.ts`.
- Migration: `prisma/migrations/20261001090000_ai_audit_append_only/migration.sql`.
- Runtime: `clinicos_ai/agents/untrusted.py` (new), `agents/assistant.py`, `agents/skill_router.py`.
- Frontend: `lib/submissionKey.ts` (new), `TerapiaFarmacologicaTab.tsx`, `DiarioPazienteTab.tsx`,
  `assistant/assistantApi.ts`, `assistant/AssistantMode.tsx`, `App.tsx`.
- Tests: `backend/src/safety/__tests__/adversarial.test.ts` (new), `scripts/safety/safety-browser-e2e.mjs`
  (new), `clinicos-ai-runtime/tests/test_untrusted.py` (new), `frontend/src/lib/__tests__/submissionKey.test.ts`
  (new), `parameter-reading-input.test.ts`; adapted to the new contract: document tests (3),
  diary/therapy contract tests (2), audit-cleanup removal (2), Phase 4 browser step I.
- Docs: `.ai-architecture/phase-6-safety/*` (9 files), `.ai-architecture/CURRENT_STATE.json`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                           |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | `THREAT_MODEL.md` — identity, authorization, resident, agent, voice, injection, backend, audit                     |
| AC2 |   PASS | `ADVERSARIAL_TEST_MATRIX.json` — 51 scenarios, 51 PASS, all fields present                                         |
| AC3 |   PASS | AUTH-01…06, FC-03, FC-04 (TOCTOU revoke, role change, policy/scope outage → deny); 188 routes, 0 uncatalogued (QA) |
| AC4 |   PASS | RES-_, VOI-_, TX-_, PROV-_, LEAK-*, FC-02, UI-R1…R3, UI-D1, UI-S1                                                  |
| AC5 |   PASS | INJ-01…05, RT-INJ-01/02                                                                                            |
| AC6 |   PASS | AUD-01…05 (append-only trigger refuses UPDATE/DELETE/TRUNCATE)                                                     |
| AC7 |   PASS | regression below; 9 artefacts + PROMPT7_HANDOFF.md                                                                 |

## Test Results

| Test             | Result | Evidence                                                                                                                                  |
| ---------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | runtime 187/187; `parameter-reading-input` 7/7; `submissionKey` 1/1; skills/voice/assistant/composer 103/103                              |
| Integration      |   PASS | adversarial suite 44/44 (real app + Postgres + policy API)                                                                                |
| API              |   PASS | backend full serial suite on a fresh DB: 1642 tests, 21 fail = the pre-existing baseline set, 0 new (`evidence/regression-backend-*.txt`) |
| Playwright       |   PASS | safety 18/18, Phase 4 Assistant 47/47, Phase 5 voice 78/78 (real Agno + Gemini STT) — `evidence/*.json`, `evidence/screens/`              |
| Persistence      |   PASS | DB-verified counts in every write scenario (exactly-once, zero-write)                                                                     |
| Agnos AI         |   PASS | 41/41 browser skill requests audited `interpreter:agno`; fenced prompts (RT-INJ-*)                                                        |
| Voice            |   PASS | VOI-01…07; voice browser 78/78                                                                                                            |
| OCR              |     NA | extraction prompt fencing only (INJ-02); no OCR behaviour change                                                                          |
| Security/privacy |   PASS | independent QA verdict READY FOR QA (0 critical, 0 high); follow-ups applied                                                              |

Frontend `npm test`: 999 tests, 990 pass, 9 fail — identical set to the pre-change baseline.
Builds / typecheck: backend `tsc --noEmit`, frontend `tsc -b` + `npm run build` pass. Lint clean
on changed files (App.tsx keeps its 3 pre-existing react-hooks errors, identical on origin/main).

## Runtime Evidence

`evidence/safety-browser-e2e.json` + screenshots R1 (lost answer → «Esito verificato»), R2
(confirm not delivered → «nessuna registrazione»), R3 («Esito NON verificato»), S1 (logout with
the Assistant open — negative control: the check fails when the fix is removed), D1 (diary
retry → one entry, same requestId).

## Logs

Only sanitized logs. No secrets printed; runtime credentials injected by `railway run` into a
local process; all databases local.

## Residual Risks

`.ai-architecture/phase-6-safety/PROMPT7_HANDOFF.md` §11 (R-01…R-20), none critical.
Pending owner confirmations (not blocking verification): Entra documents now follow the Resident
Access Scope (supersedes the PO «struttura» exception of #260 — stricter); production
`AUTH_MODE`; Azure STT deployment (PR #393).

## Final Decision

CLOSED — VERIFIED
