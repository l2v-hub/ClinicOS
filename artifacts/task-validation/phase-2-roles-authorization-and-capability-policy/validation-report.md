# Task Validation Report

## Task

- Title: Phase 2 roles authorization and capability policy
- Slug: phase-2-roles-authorization-and-capability-policy
- Commit: not committed (worktree `C:/Workspace/ClinicOSHouse-worktrees/capability-layer`, branch `feat/capability-tool-layer`, base `origin/main` 76ac4c60)
- Date: 2026-09-30

## Implementation Summary

Single Identity → Role → Capability policy (one versioned document) enforced on GUI/API routes
(global gate), Tool Layer (default hook), Agnos (catalog, plan/execute, read tools) and the policy
admin API; Role Simulator as dev identity source (server-signed, identity-only tokens); legacy
Operator/Administrator kept as legacy roles with today's behaviour; Administrator "Ruoli e permessi"
UI with matrix/views/impact/Save/Apply/history; proactive prudent baseline for Administrator,
Supervisor, Doctor, Nurse, OSS with doubtful cells flagged. Details:
`.ai-architecture/phase-2-authorization/*`.

## Files Changed

- New backend: `backend/src/authz/**` (+ `__tests__`), `backend/src/routes/authz.ts`,
  `prisma/migrations/20260930090000_authz_policy_versions`, `scripts/ai-architecture/{build-authz-registry.mjs,export-role-matrix.ts}`.
- Modified backend: `prisma/schema.prisma` (new model only), `backend/src/ai/auth.ts`,
  `backend/src/app.ts`, `backend/src/tools/{types,hooks,registry,http}.ts`,
  `backend/src/tools/capabilities/assistant.ts`, `backend/src/ai/{audit-store.ts,gateway/types.ts,voice/execute.ts,actions/orchestrate.ts,assistant/service.ts}`,
  `backend/src/routes/{ai-actions,ai-assistant-public,ai-voice}.ts`, tests `src/__tests__/cors-security.test.ts`,
  `src/tools/__tests__/{tool-layer-core,operations}.test.ts`.
- Frontend: `Login.tsx/.css`, `App.tsx`, `types.ts`, `lib/{operatorSession,capabilities,authzPolicyApi}.ts`,
  `TeamsLikeSidebar.tsx`, `UserMenu.tsx`, `components/admin/RolePermissionsPage.*` + `role-permissions/*`,
  header builders (agnos, AIAssistantButton, DischargeImportModal, intakeDraftApi, entraAuth),
  action gates (TerapiaFarmacologicaTab, ConsegnePage, ConsegnaComposer, OperatorAgenda, AdminAgenda),
  `useAnomalieReparto.ts`, `useRiepilogoSomministrazioni.ts`, frontend unit tests.
- Evidence tooling: `qa-evidence/phase2-roles/roles-evidence.mjs`.

## Acceptance Criteria Result

| AC                                                                                         | Result | Evidence                                                                                                                    |
| ------------------------------------------------------------------------------------------ | -----: | --------------------------------------------------------------------------------------------------------------------------- |
| AC1 Identity→Role→Policy→Tool discovery→invocation→backend→business logic→audit (Doctor 1) |   PASS | `agno-readiness.test.ts` steps 1-5,7; `authz-e2e.test.ts` Doctor test                                                       |
| AC2 Identity→Role→Policy→DENIED (OSS 1) via tool and direct route                          |   PASS | `agno-readiness.test.ts` step 6 (+ case/slash/HEAD/malformed variants); `authz-e2e.test.ts` OSS test                        |
| AC3 Admin edits Nurse, Save/Apply → open Nurse session follows at next call                |   PASS | `authz-e2e.test.ts` dynamic test (same token); browser steps 7-10                                                           |
| AC4 Agno-visible tools follow identity/role/policy                                         |   PASS | `/tools` + Agnos catalog assertions (harness + e2e)                                                                         |
| AC5 Historical integrity after revocation                                                  |   PASS | e2e: consegna row + audit row keep SIM-NURSE-1 / nurse                                                                      |
| AC6 No regressions; builds pass                                                            |   PASS | backend serial 1472/21 vs main 1374/21 identical failing set; frontend 915/9 vs 899/9 identical; both builds pass (`logs/`) |
| AC7 Client cannot self-assign identity/role/capability                                     |   PASS | headers refused with simulator (401), forged token 401, spoofed role ignored (403), tool input schema rejects identity keys |
| AC8 Admin UI verified in a real browser incl. persistence after reload                     |   PASS | `logs/playwright-results.json` 10/10, screenshots 01-14, traces, videos                                                     |

## Test Results

| Test             | Result | Evidence                                                          |
| ---------------- | -----: | ----------------------------------------------------------------- |
| Unit             |   PASS | `policy-model.test.ts` 10/10                                      |
| Integration      |   PASS | authz suites on Postgres 19/19 (`logs/authz-tests.log`)           |
| API              |   PASS | e2e over HTTP on the real app                                     |
| Playwright       |   PASS | 10/10, 0 console errors                                           |
| Persistence      |   PASS | history after full reload; DB assertions                          |
| Agnos AI         |   PASS | catalog/plan/execute/read-tool filtering tests                    |
| Voice            |   PASS | shares the orchestrator gate; voice routes governed by `voice.*`  |
| OCR              |     NA | routes governed by the gate; no functional change                 |
| Security/privacy |   PASS | independent QA re-verification READY FOR QA (`logs/qa-phase2.md`) |

## Runtime Evidence

`screenshots/`, `trace/`, `video/`, `logs/{playwright-results.json,browser-console-errors.txt,backend-serial-*.txt,frontend-*.txt,authz-tests.log,backend-build.log,frontend-build.log,qa-phase2.md}`.

## Logs

Only sanitized logs are allowed. Audit rows carry ids, role, capability and decision metadata only.

## Residual Risks

See `.ai-architecture/phase-2-authorization/PROMPT3_HANDOFF.md` §4 (G1–G10, R1–R2). Migration not
applied to any shared database; nothing deployed.

## Final Decision

CLOSED — VERIFIED
