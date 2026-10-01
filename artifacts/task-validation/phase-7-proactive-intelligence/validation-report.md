# Task Validation Report

## Task

- Title: Phase 7 proactive intelligence
- Slug: phase-7-proactive-intelligence
- Commit: (branch feat/phase7-proactive — see PR)
- Date: 2026-10-01

## Implementation Summary

Prompt 7: EVENT → DETERMINISTIC ELIGIBILITY → POLICY/SCOPE → (AI SYNTHESIS) → HUMAN ATTENTION.
13 real event types from existing tables, deterministic signals (grouping, dedup, revisions, ack,
change-since-last-view), Attention Inbox «Per te» + badge, shift briefing (facts + ≤ 1 AI call on
fixed templates, fallback, cost guard), Signal → existing Skill / reopen preview / classic screen,
audit. No Prisma model change (ack / seen as append-only audit facts). Also fixed: Phase 6
untrusted-data rule refused by Azure Prompt Shields (jailbreak false positive).

## Files Changed

- Backend: `src/proactive/{catalog,sources,engine,time,http}.ts` (new), `skills/index.ts`,
  `skills/store.ts`, `skills/http.ts`, `routes/note.ts` (export of the existing rule), `app.ts`,
  `ai/untrusted-prompt.ts`.
- Runtime: `clinicos_ai/agents/untrusted.py` (rule wording).
- Frontend: `components/assistant/{ProactivePanel,AssistantEntryBadge}.tsx` (new),
  `AssistantMode.tsx`, `AssistantMode.css`, `assistantApi.ts`, `App.tsx`, `App.css`.
- Tests: `backend/src/proactive/__tests__/{proactive-e2e,proactive-unit}.test.ts`,
  `backend/src/ai/__tests__/untrusted-prompt.test.ts`, runtime `tests/test_untrusted.py`.
- Scripts: `scripts/proactive/{seed-proactive-demo.mts,proactive-browser-e2e.mjs,export-catalog.mts}`,
  `scripts/ai/prompt-filter-check.py`.
- Docs: `.ai-architecture/phase-7-proactive/*` (11 artefacts), `.ai-architecture/CURRENT_STATE.json`,
  `.ai-architecture/phase-6-safety/PROMPT_INJECTION_DEFENSES.md` (§6 update).

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                        |
| --- | -----: | ----------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `EVENT_CATALOG.json` (13 integrated), `SIGNAL_CATALOG.json`; AI summary never stored            |
| AC2 |   PASS | eligibility on the active policy, scope in queries; A, B, E, F, N, S, W; admin no clinical feed |
| AC3 |   PASS | inbox (what/resident/when/origin/status/action/why), ack K/Q/R/U, dedup J, watermark D          |
| AC4 |   PASS | briefing C, fallback M, cost guard V, browser C (real model, composed)                          |
| AC5 |   PASS | G (existing skills, reopen keeps «Conferma»), H (no autonomous write), I (handover NORMAL)      |
| AC6 |   PASS | L, T (injection / free text never to the LLM), leakage A/B/S/W + browser                        |
| AC7 |   PASS | P + browser audit checks; `E2E_TEST_REPORT.md` §5 cost/performance                              |
| AC8 |   PASS | regression table below; `PROMPT8_HANDOFF.md`                                                    |

## Test Results

| Test             | Result | Evidence                                                                                             |
| ---------------- | -----: | ---------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | proactive-unit 6/6; untrusted-prompt 2/2; runtime 188/188                                            |
| Integration      |   PASS | proactive-e2e 23/23 (29/29 with unit) on the real app + Postgres + policy API                        |
| API              |   PASS | `/skills/proactive/*` via HTTP in the e2e suite                                                      |
| Playwright       |   PASS | proactive browser 29/29; safety 18/18; Assistant 47/47; voice 78/78                                  |
| Persistence      |   PASS | ack / watermark read back after refresh (K, D, browser D/K)                                          |
| Agnos AI         |   PASS | skills opened via the Agno interpreter; real compose model in the briefing; provider filter check OK |
| Voice            |   PASS | voice browser 78/78                                                                                  |
| OCR              |     NA | extraction prompt wording only — provider check OK                                                   |
| Security/privacy |   PASS | independent QA: FAILED VALIDATION ×2 → fixed → READY FOR QA (0 open critical/high)                   |

Backend full serial suite on a fresh DB: 1673 tests, 1651 pass, 21 fail = the pre-existing baseline set, 0 new (`evidence/regression-backend-full-summary.txt`).
Frontend: 999 tests, 990 pass, 9 fail — identical pre-existing set. Builds / `tsc` pass; lint clean
on changed files (App.tsx keeps 3 pre-existing react-hooks errors + 1 warning, as on origin/main).

## Runtime Evidence

`evidence/proactive-browser-e2e.json` + `evidence/screens/` (nurse inbox, changes, signal → skill,
resume workflow, briefing with real AI synthesis, OSS, supervisor, admin);
`evidence/performance-baseline.json`, `evidence/performance-cached-briefing.json`.

## Logs

Sanitized only; provider credentials injected by `railway run` into local processes, never printed;
all databases local.

## Residual Risks

`.ai-architecture/phase-7-proactive/CURRENT_STATE.md` §4 (R7-1…R7-6) + Phase 6 residuals; none
critical.

## Final Decision

CLOSED — VERIFIED
