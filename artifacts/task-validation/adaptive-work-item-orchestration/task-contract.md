# Task Contract

## Task
- Title: Adaptive work item orchestration
- Slug: adaptive-work-item-orchestration
- Type: feature
- Date: 2026-10-23

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

The existing controller routes whole accepted groups to Codex senior/small models. It has no executable per-ticket dependency graph and no optional local Claude Max implementation adapter. Matt Pocock skills were copied only into the original cloud checkout; shared provider-neutral work packets are not yet wired into execution.

## Expected Behaviour

Add bounded adaptive work-item delegation to the existing controller: validated precise packets and DAG dependencies, owned isolated worktrees, explicit available provider/model selection, real per-session durable reservations before inference, scope and integration checks, and unknown-outcome no replay. Support Codex and explicitly enabled local subscription Claude models without Anthropic API fallback or running Max in hosted Actions. Preserve current independent Claude review and the parent group verification/QA/release flow. Keep existing plan/state/history backwards compatible and untouched. Use shared Matt Pocock skill/config semantics; role/queue labels remain the existing protocol.

## Acceptance Criteria

- AC1: Shared work-item contracts validate bounded inputs, dependency DAGs, per-item acceptance/test/file scope and safe risk/model routing.
- AC2: Existing controller actually executes ready items with owned isolation, durable pre-inference reservations, finite budgets, serialized persistence/merges and exact source/scope checks. Dependent or conflicting work cannot race.
- AC3: Codex and optional local Claude adapters accept the same packet, validate actual CLI capabilities and structured output, preserve credential/network/tool boundaries and never choose unavailable providers/models or API billing fallbacks.
- AC4: Known failure can be explicitly resumed/escalated within recorded budgets; unknown spawn/save/timeout/merge outcomes remain unresolved without a hidden repeated inference. Restart preserves completed work and full attempt history.
- AC5: Existing controller tests and new meaningful fault/real-Git integration tests pass; an independent QA session finds no actionable issues. No clinical app code, existing canonical subject, active PR504 request, release policy, credentials or live patient data changes.
- AC6: Shared skills/configuration and documentation explain actual supported behavior, explicit opt-in and runtime limits without claiming real provider inference or deployment from synthetic tests.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Packet/DAG validation, model selection, adapters, budgets and fault paths. |
| Integration | yes | Actual dispatcher callers plus real temporary Git worktrees/commits and CLI stand-ins; existing controller regressions. |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Restricted worker environment/tools, no secrets or patient data, invalid schema/symlink/scope/ownership cases. |

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

A new sparse isolated branch is based on exact candidate9 of PR504, which remains unchanged and under its own pending review. No uncontrolled subprocess, billing-provider fallback, inferred external capacity or blind retry is allowed. Actual local Max/model inference and native skill catalog reloading cannot be asserted from fixtures. Parent review/verification and deployment proof remain required. Only owned temporary worktrees may be cleaned; preserve user modifications and all prior evidence. Architecture analysis must be accepted by root before implementation.

## Gate Status

READY FOR IMPLEMENTATION
