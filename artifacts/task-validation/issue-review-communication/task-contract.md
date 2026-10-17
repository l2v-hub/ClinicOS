# Task Contract

## Task
- Title: issue-review-communication
- Slug: issue-review-communication
- Type: change
- Date: 2026-10-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The user explicitly requests direct model communication through GitHub source-issue comments and labels. The existing personal cron writes generic completion only; errors/running state are not projected onto issues. Authorized source-issue comments can wake the controller but are missing from its correction/reviewer context. Real Max attempts for PR481 and483 failed without reports and must remain spent/blocked.

## Expected Behaviour

A trusted bridge displays current exact-SHA review state on every source issue, forwards authorized actionable issue comments into the existing PR feedback context, acknowledges receipt and wakes Codex through GitHub events. Existing normal controller exclusively owns fixes, tests/QA/new-SHA handoff and budget/release decisions.

## Acceptance Criteria

- AC1: All current source issues receive one exclusive informational label from claude-review-ready, claude-reviewing, codex-review-fixes, review-blocked, claude-reviewed, derived from validated durable state. Preserve lifecycle/unrelated labels.
- AC2: SHA/round/report-digest-bound status, findings and failure comments are idempotent and safe; no duplicate wake-up loops, raw issue dumps, secrets or clinical payloads. Running/error labels work for the old installed Windows worker through a separate five-minute scheduled state projection.
- AC3: Fresh authorized source-issue feedback is forwarded as bounded sanitized UNTRUSTED data to the existing PR snapshot/correction path, acknowledged by comment IDs, and never interpreted as approval or executable instructions.
- AC4: Every write revalidates fresh authoritative ownership/cohort and exact live PR identity/head. Reject stale, forked, reassigned, closed or unauthorized subjects with no remaining writes. No state/budget writes, models, merge/deploy/closure by the scheduled sibling.
- AC5: Comments use existing CLINICOS_BOT_TOKEN because github.token suppresses workflow events. No new API/OAuth credentials or personal-PC access request. Fixed marker is allowed by the existing controller event filter, while own notifications and mirrors are excluded from input feedback.
- AC6: Existing exact-SHA hashed structured Claude report remains sole approval proof. Failed reviews remain failed/spent and cannot be restarted by labels/comments. Corrected verified new SHA returns to existing external handoff within original four-round budgets.
- AC7: Exactly seven frozen source paths; all nineteen G guard sources and exhausted budgets remain unchanged. Meaningful regressions, independent five-phase QA with actual safe browser proof and required native CI precede publication/activation.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Existing and new actual communication/review modules, identity and races |
| Integration | yes | Stateful GitHub adapter fixtures, old-worker feedback compatibility, notification event contract |
| API | yes | Bounded authenticated GitHub transport against safe fixtures |
| Playwright | yes | Real internal safe QA surface running actual module |
| Persistence after refresh | yes | Feedback/report projection and idempotency survive refresh |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Complete source and owned evidence, secret/PHI/authorization checks |

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

Cloud cannot repair an inaccessible personal Claude invocation or manufacture its missing report. This communication feature makes that blocker visible; it does not reset/retry reviews, change frozen release guards or promise model execution from a label alone. No Claude approval is claimed for operational bootstrap. Exact-SHA context, report hashes, no-feedback-loop markers and fresh subject validation are mandatory.

## Gate Status

READY FOR IMPLEMENTATION
