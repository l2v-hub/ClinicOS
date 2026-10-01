# Task Contract

## Task
- Title: Phase 8 role specific copilots
- Slug: phase-8-role-specific-copilots
- Type: change
- Date: 2026-10-01

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | yes |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

One generic AI Assistant for every role: same home, starters in catalog order, same proactive presentation; no role workflows (shift start, resident round).

## Expected Behaviour

Prompt 8: one shared Assistant + a configurable Role Experience Profile per role (OSS, nurse, doctor, supervisor, administrator) driving home, starters, shortcuts, composite workflows, proactive presentation, briefing focus, density and wording. Policy, resident scope, skills, tools, voice and proactive engine are reused, never duplicated. No Prisma change.

## Acceptance Criteria

- AC1: configurable Role Experience Profile (file + env override, validated against the skill catalog); no authorization inside profiles.
- AC2: dynamic Role Home per role (identity/role, resident, ranked starters, shortcuts, signals, briefing shortcut, recent activity, continue work) derived from policy + scope + skill availability + signals.
- AC3: OSS / nurse / doctor / supervisor / administrator copilots work; administrator has no clinical feed or write.
- AC4: shortcuts and composite workflows (start shift, resident round) reuse existing skills; previews and confirmations never bypassed.
- AC5: voice and text converge on the same shortcut/skill path; prompts carry only a short role hint + the authorized skill subset.
- AC6: role switch / resident switch / policy update invalidate context, shortcuts and pending workflows; backend still denies.
- AC7: E2E + usability per role; regression Prompts 1–7; context-size baseline; PROMPT9_HANDOFF.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | profile validation, ranking |
| Integration | yes | copilot e2e on the real app |
| API | yes | /skills/copilot/* |
| Playwright | yes | copilot browser E2E per role |
| Persistence after refresh | no | |
| Agnos action registry | yes | role hint to the skill router |
| Voice simulation | yes | voice/text convergence + voice regression |
| OCR/import test | no | |
| Security/privacy scan | yes | role switch, scope, admin, independent QA |

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

Profile drift from policy → profiles never grant, always filtered by live availability. Context leakage on role switch → home recomputed per request, UI state reset on identity change. Composite bypass → every step is a normal converse turn.

## Gate Status

READY FOR IMPLEMENTATION
