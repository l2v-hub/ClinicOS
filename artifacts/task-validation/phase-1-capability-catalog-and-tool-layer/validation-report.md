# Task Validation Report

## Task

- Title: Phase 1 capability catalog and tool layer
- Slug: phase-1-capability-catalog-and-tool-layer
- Commit: not committed (worktree `C:/Workspace/ClinicOSHouse-worktrees/capability-layer`, branch `feat/capability-tool-layer`, base `origin/main` 76ac4c60)
- Date: 2026-09-30

## Implementation Summary

Capability catalog of record (200 capabilities, READY 95 / WRAP 49 / GAP 56) and a minimal
Application Tool Layer (`backend/src/tools`) exposing 56 capabilities as tools over the existing
services, with a uniform contract (naming, JSON-schema envelope, error model, identity context,
patient scope, idempotency declaration) and replaceable authorization/audit hooks, plus an HTTP
surface `/tools` for an orchestrator. Local verbatim refactors only where logic was inline in a
handler for a critical capability (administrations, diary create/with-therapy, intake draft owner).
Details: `.ai-architecture/phase-1-capabilities/*`.

## Files Changed

- New: `backend/src/tools/**` (core + 12 capability modules + 13 test files),
  `backend/src/therapies/administration-record.ts`, `backend/src/patients/diary-write-service.ts`,
  `backend/src/patients/diary-author.ts`, `scripts/ai-architecture/render-capability-catalog.mjs`,
  `.ai-architecture/**`.
- Modified: `backend/src/app.ts` (mount `/tools`), `backend/src/ai/audit-store.ts` (channel type),
  `backend/src/ai/ownership.ts` (export owner loader), `backend/src/routes/therapy.ts`,
  `backend/src/routes/patient-diary.ts`, `backend/src/routes/patient-documents.ts` (exports),
  3 route contract tests re-pointed to moved code.
- Not changed: Prisma schema, frontend, env/config.

## Acceptance Criteria Result

| AC                                                                                  | Result | Evidence                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 catalog from real code, READY/WRAP/GAP motivated                                |   PASS | `CAPABILITY_CATALOG.json` (every entry has `rationale`; GAP entries have cause/minimal change/files/risk)                                                                                                                                                         |
| AC2 tool layer, uniform contract, no duplicated business logic                      |   PASS | `TARGET_TOOL_ARCHITECTURE.md`; tools call existing symbols listed in `services`; code review of refactors (verbatim moves)                                                                                                                                        |
| AC3 every INVOCABLE/TESTED capability has passing automated evidence; others marked |   PASS | `evidence/tool-tests.log` 79/79; `tool-catalog-consistency.test.ts`; 12 EXPOSED-unverified + 63 not-exposed explicitly listed in `CURRENT_STATE.json`                                                                                                             |
| AC4 GUI == Tool for critical capabilities                                           |   PASS | 45 capabilities with GUI-parity cases (consegne.create, administration.confirm, diary.create, narrative.save, clinical_record.save, parameters.create_reading, assessments.create_draft/finalize, intake.confirm_draft, documents.upload, roster.set_my_order, …) |
| AC5 no new failures vs baseline; build passes                                       |   PASS | serial fresh-DB runs: main 1374/21 fail, branch 1453/21 fail (1475 tests), identical failing set (`evidence/serial-*`); `evidence/backend-build.log`; tsc 0; eslint 0                                                                                                          |
| AC6 CURRENT_STATE.json + PROMPT2_HANDOFF.md complete                                |   PASS | `.ai-architecture/CURRENT_STATE.json`, `phase-1-capabilities/PROMPT2_HANDOFF.md`                                                                                                                                                                                  |

## Test Results

| Test                                               | Result | Evidence                                                                                                                                      |
| -------------------------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (pipeline, error model, hooks)                |   PASS | `tool-layer-core.test.ts` 6/6                                                                                                                 |
| Integration (tool → service → Postgres)            |   PASS | 79/79 `evidence/tool-tests.log`                                                                                                               |
| API (HTTP `/tools` on real app; GUI routes parity) |   PASS | `tool-layer-core.test.ts`, domain parity cases                                                                                                |
| Playwright                                         |     NA | no UI change in Phase 1                                                                                                                       |
| Persistence                                        |   PASS | DB assertions in tool tests (rows re-read from Postgres)                                                                                      |
| Agnos AI                                           |   PASS | existing AI suites unchanged in serial comparison; `assistant.test.ts` 6/6                                                                    |
| Voice                                              |     NA | not touched                                                                                                                                   |
| OCR                                                |     NA | not touched (catalogued, not exposed)                                                                                                         |
| Security/privacy                                   |   PASS | scope tests per domain (foreign patient → not_found, no writes); legacy role gates (operatore → forbidden); audit PHI-safe (field names only) |

## Runtime Evidence

`evidence/tool-tests.log`, `evidence/serial-main-summary.txt`, `evidence/serial-branch-summary.txt`,
`evidence/serial-main-failures.txt`, `evidence/serial-branch-failures.txt`,
`evidence/parallel-*-failures.txt`, `evidence/backend-build.log`.

## Logs

Only sanitized logs are allowed. Tool errors log only the error class name; audit stores field
names, never values.

## Independent QA

clinicos-qa agent (did not write the code): verdict READY FOR QA. MEDIUM findings fixed and
re-verified (documents.upload HTTP body limit; duplicated route logic moved into shared
functions). LOW findings documented in PROMPT2_HANDOFF.md §6.

## Residual Risks

See `.ai-architecture/CURRENT_STATE.json#residual_risks`. Tests used a disposable local Postgres
(embedded, session scratchpad), not the production database; no deploy was performed.

## Final Decision

CLOSED — VERIFIED
