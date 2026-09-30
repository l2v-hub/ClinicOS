# Task Contract

## Task

- Title: Phase 3 skills workflows agno
- Slug: phase-3-skills-workflows-agno
- Type: feature
- Date: 2026-09-30
- Source: `.ai-prompts/PROMPT_3_SKILLS_WORKFLOWS.md` (user request 2026-09-30), handoff `.ai-architecture/phase-2-authorization/PROMPT3_HANDOFF.md`
- Branch: `feat/phase3-skills` (from origin/main 1df5c1d0)

## Impact Classification

| Area                 |                                                                               Impacted |
| -------------------- | -------------------------------------------------------------------------------------: |
| Frontend/UI          |                                            no (no AI Assistant redesign in this phase) |
| Backend/API          | yes (new `/skills` surface: catalog, availability, workflow engine; reuses Tool Layer) |
| Database/Persistence |                                       no (no schema change; audit reuses AiAuditEvent) |
| Agnos AI / Chatbot   |                                yes (Agno skill router endpoint in clinicos-ai-runtime) |
| Voice                |                                                                                     no |
| OCR / Import         |                                                                                     no |
| Auth / Permissions   |                yes (skill availability derived from the Phase 2 policy; no new grants) |
| Privacy / Security   |                      yes (user text to the runtime for interpretation; audit PHI-safe) |
| Config / Env         |                         yes (optional SKILLS_INTERPRETER, reuses AI_RUNTIME_URL/TOKEN) |

## Current Behaviour

The Tool Layer (Phase 1) and the policy (Phase 2) expose single atomic tools. There is no notion of
a user goal (skill), no multi-turn workflow state, no central confirmation policy for AI-initiated
writes, and Agno only plans read queries.

## Expected Behaviour

Natural language → Identity → Role/Policy → Skill selection (Agno, fallback deterministic) →
context resolution → explicit workflow state → preview + confirmation for writes → authorized tool
via the Tool Layer (re-authorized per call) → existing business logic → verified result → audit.

## Acceptance Criteria

- AC1: persistent Skill Catalog (JSON + MD) and Role → Skill matrix derived from the real capabilities and the active policy.
- AC2: A — read skill E2E (natural language → skill → authorized read tool → backend → result).
- AC3: B — write skill E2E with structured preview, explicit confirmation, persisted row, audit.
- AC4: C — ambiguous/missing target → NEEDS_CLARIFICATION, no write.
- AC5: D — identity without capability → DENIED, confirmed by the backend.
- AC6: E — multi-turn workflow with structured state completes correctly.
- AC7: F — capability revoked during the workflow → policy re-evaluated → DENIED, no write.
- AC8: G — cancellation before confirmation → no write.
- AC9: H — backend failure → no false success; retry does not duplicate a write.
- AC10: I — audit reconstructs identity, role, skill, tool, confirmation, outcome, origin=ai.
- AC11: J — Phase 1/2 regression suites green (no new failures vs main).
- AC12: Agno (real runtime) selects the skill from natural language in at least one live E2E run.
- AC13: `.ai-architecture/phase-3-skills/*` artifacts and PROMPT4_HANDOFF complete; CURRENT_STATE.json updated.

## Test Plan

| Test type                 | Required | Reason                                                           |
| ------------------------- | -------: | ---------------------------------------------------------------- |
| Unit                      |      yes | catalog/availability/confirmation/interpreter/workflow engine    |
| Integration               |      yes | HTTP E2E A–J on the real app + real Postgres + Role Simulator    |
| API                       |      yes | live run with the real Agno runtime                              |
| Playwright                |       no | no UI in this phase                                              |
| Persistence after refresh |      yes | written rows verified in Postgres                                |
| Agnos action registry     |      yes | skill router endpoint (runtime pytest)                           |
| Voice simulation          |       no | out of scope                                                     |
| OCR/import test           |       no |                                                                  |
| Security/privacy scan     |      yes | no PHI in audit/logs; LLM cannot confirm; no tool outside policy |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (backend + runtime)
- live Agno E2E transcript (sanitized)
- `.ai-architecture/phase-3-skills/E2E_TEST_REPORT.md`

## Risks

- Workflow state is in-process (TTL): lost on restart (documented gap; store is pluggable).
- LLM variability: Agno output is validated; deterministic fallback; LLM never confirms.
- G1 ownership scope: tests create patients owned by the simulated identity.

## Gate Status

READY FOR IMPLEMENTATION
