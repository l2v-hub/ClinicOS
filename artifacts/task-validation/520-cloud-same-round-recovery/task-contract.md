# Task Contract

## Task
- Title: 520 Cloud Same Round Recovery
- Slug: 520-cloud-same-round-recovery
- Type: feature
- Date: 2026-10-31

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes, explicit recovery execution capability |
| Privacy / Security | yes, credentials and durable ownership |
| Config / Env | yes, explicit workflow input only |

## Current Behaviour

PR520 head6b7055d773f4e36d85f149aecbf31059ed5bb00e has a consumed global round5 nested in postMergeFollowups. Its local OAuth attempt failed before inference. Cloud probe41246326981 passed, but trusted main only handles new native claims, appending a round. The generic reader also requires a committed implementation-plan absent from this frozen head. The human now authorizes a separate technical PR only: no automatic merge, no Claude calls and no change to520SHA/history/budget.

## Expected Behaviour

A separate explicit cloud recovery entry can consume a separately verified execution capability for the SAME failed reservation, append one technical execution, and keep old four reviews plus consumed fifth byte-identical. Native main/PR/head/actor/check guards and CAS bind all side effects. Authentication stays subscription-only, no tools/checkout of reviewed code/API fallback. Missing plan may be supplied only by this trusted recovery adapter as explicitly generated canonical data, never falsely attributed to the frozen commit. Generic queue behavior stays fail-closed and unchanged. This PR is prepared/tested only, not activated or merged.

## Acceptance Criteria

- AC1: Host authorization requires an injected trusted verifier and binds exact batch/followup/request/failed-review nonce, SHA, round and hashes with budget:null. Forged, replayed, mismatched or missing capabilities fail closed. Existing user request record alone is not an execution capability.
- AC2: Only explicit workflow_dispatch recovery inputs, trusted main and an authorized maintainer can select recovery; schedules/labels cannot auto-recover. Claim is one CAS append to request.execution, never a new review/round/allowance. Original failed review, original reviews, budget extensions, implementation and release history are unchanged.
- AC3: Exact source and evidence retrieved as bounded API data; no PR execution, tools, secrets in packet or fallback API. Generic readers still require their original documents. A recovery-specific missing-plan projection is validated against canonical source manifest and annotated generated/not-committed.
- AC4: Fresh ownership/nonces/SHA/checks/source/capability guards before provider, retain and actual publish POST. Concurrent/replayed/revoked/stale attempts do not invoke inference or overwrite a competing result. A provider failure remains consumed; report/publication uncertainty retains the actual full validated report and never retries inference.
- AC5: Tests use exclusively mock providers and synthetic state. Unit, adversarial integration, existing controller regression, workflow/environment checks and independent QA must pass. Synthetic HTML/JSON result, screenshot and trace prove counters and history survive reload; never call actual Claude or modify production canonical state for testing.
- AC6: Publish only a separate technical PR with sanitized source-bound evidence and CI. Keep PR520 at exact6b7055.., original consumed fifth and limit5 unchanged. No merge/deploy/issue close, no paid review, no new allowance, no auth secret edits/copies or unrelated issue work.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Pure guards, native capability, one-shot CAS, error/replay/security cases |
| Integration | yes | Mock cloud-worker lifecycle with actual core/reader/publisher seams |
| API | no | |
| Playwright | yes | Non-production synthetic result report, asserted values and reload |
| Persistence after refresh | yes | Durable synthetic state preserved across worker/report reload |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Secrets/PHI/env/workflow/source/credentials and immutable budget guards |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- synthetic internal QA result screenshot
- Playwright trace and result JSON/HTML
- no real provider invocation or remote clinical data
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Root is integration owner and sole writer in C:/w-rv/520-cloud-recovery-impl20261031. A separate agent writes only new recovery core+tests in its own checkout; root integrates those exact files. A fresh dedicated QA session runs after source freeze. No package manifests/lockfiles/application/backend/clinical source change. Scope: new recovery core/worker/tests, small native source-reader and publisher guard additions, trusted workflow explicit dispatch, documentation and artifacts. No code executes with real cloud credentials during preparation. Preserve all failed attempts; original normal handoff remains a new-round mechanism.

## Gate Status

READY FOR IMPLEMENTATION
