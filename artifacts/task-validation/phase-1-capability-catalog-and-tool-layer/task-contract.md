# Task Contract

## Task

- Title: Phase 1 capability catalog and tool layer
- Slug: phase-1-capability-catalog-and-tool-layer
- Type: feature
- Date: 2026-09-30
- Source: `.ai-prompts/PROMPT_1_CAPABILITY_TOOL_LAYER.md` (user request, 2026-09-30)
- Branch/worktree: `feat/capability-tool-layer` @ `C:/Workspace/ClinicOSHouse-worktrees/capability-layer` (from `origin/main` 76ac4c60)

## Impact Classification

| Area                 |                                                                   Impacted |
| -------------------- | -------------------------------------------------------------------------: |
| Frontend/UI          |                                                                         no |
| Backend/API          |            yes (new additive Tool Layer module; no existing route changed) |
| Database/Persistence |               no (no schema change; tests use a disposable local Postgres) |
| Agnos AI / Chatbot   |  yes (catalog maps existing Agnos actions/read-tools; no behaviour change) |
| Voice                |                                                                         no |
| OCR / Import         |                                                                         no |
| Auth / Permissions   | yes (authorization/audit HOOKS only; no new role model — that is Prompt 2) |
| Privacy / Security   |        yes (tool layer must not bypass existing patient-scope/role checks) |
| Config / Env         |                                                                         no |

## Current Behaviour

Features are reachable only through Express routes (GUI) and a separate Agnos action/read-tool
layer (`backend/src/ai/**`). There is no uniform, machine-readable capability catalog and no single
application Tool Layer with a common naming / schema / error / authorization-hook / audit-hook
contract.

## Expected Behaviour

- `.ai-architecture/` holds the persistent Phase 1 artifacts (catalog JSON+MD, assessment, target
  architecture, regression baseline, migration plan, Prompt 2 handoff, CURRENT_STATE.json).
- A minimal Tool Layer (`backend/src/tools/**`) exposes READY/WRAP capabilities by calling the
  EXISTING services (wrap, don't rewrite), with authorization + audit hooks (pass-through for now).
- Every capability declared INVOCABLE has an automated test `tool -> existing service -> business
outcome`, run against a real (disposable, local) Postgres.

## Acceptance Criteria

- AC1: Capability catalog derived from real code (every route/service mapped), each capability with
  READY/WRAP/GAP + rationale.
- AC2: Tool Layer implemented with uniform naming, input/output schema, error model, validation,
  authz hook, audit hook, identity/patient context, idempotency where needed — without duplicating
  business logic (tools call existing service symbols).
- AC3: Every capability marked INVOCABLE/TESTED has an automated passing test; non-testable or
  failed ones are explicitly marked, not hidden.
- AC4: For critical capabilities, GUI(HTTP route) outcome == Tool outcome is verified by test.
- AC5: Existing backend test suite shows no new failures vs. the pre-change baseline; backend
  `tsc` build passes.
- AC6: `CURRENT_STATE.json` and `PROMPT2_HANDOFF.md` complete.

## Test Plan

| Test type                 | Required | Reason                                                                                  |
| ------------------------- | -------: | --------------------------------------------------------------------------------------- |
| Unit                      |      yes | tool registry / schema / error model                                                    |
| Integration               |      yes | tool -> service -> Postgres outcome                                                     |
| API                       |      yes | GUI route vs tool parity for critical capabilities                                      |
| Playwright                |       no | no UI change in Phase 1                                                                 |
| Persistence after refresh |       no | no UI change                                                                            |
| Agnos action registry     |      yes | catalog mapping of existing actions must not change their behaviour (existing ai tests) |
| Voice simulation          |       no |                                                                                         |
| OCR/import test           |       no |                                                                                         |
| Security/privacy scan     |      yes | tool layer must preserve patient-scope checks (tests)                                   |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (baseline + after) under `artifacts/task-validation/<slug>/`
- API/tool parity test output
- persistence proof via DB assertions in integration tests

## Risks

- No persistent staging DB: tests run on a disposable embedded Postgres (local only, never prod).
- Pre-existing red tests on main (see memory: ~21 codex-line backend tests) — compared by baseline, not fixed here.
- Services with logic inline in route handlers (GAP) are NOT refactored in this phase unless minimal.

## Gate Status

READY FOR IMPLEMENTATION
