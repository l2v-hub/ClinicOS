# Task Contract

## Task
- Title: Cloud Claude Max review worker
- Slug: cloud-claude-max-review-worker
- Type: config
- Date: 2026-10-25

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

Existing cloud controller is disabled; Claude runs only through the external local watcher. Genuine pending findings remain recorded.

## Expected Behaviour

Review Claude on GitHub-hosted runner with Max subscription only. No local PC required. Event label claude-review-ready plus scheduled catchup every ten minutes; preserve native claim/request/SHA/budget and all existing reports. Never execute PR code/settings/hooks or give reviewer GitHub/deploy/API credentials. Persist genuine review then return codex-review-ready and wake Codex. Test credential in real hosted runner before attempting a review; no Anthropic API fallback. Ownership and final independent Codex/deploy gates remain.

## Acceptance Criteria

- AC1: Review Claude on GitHub-hosted runner with Max subscription only. No local PC required. Event label claude-review-ready plus scheduled catchup every ten minutes; preserve native claim/request/SHA/budget and all existing reports. Never execute PR code/settings/hooks or give reviewer GitHub/deploy/API credentials. Persist genuine review then return codex-review-ready and wake Codex. Test credential in real hosted runner before attempting a review; no Anthropic API fallback. Ownership and final independent Codex/deploy gates remain.
- AC2: Independent targeted tests and security audit PASS, no application/clinical/database/provider changes.
- AC3: Actual hosted qualification and exact head/status receipts; no claim of activation until native events and authentication pass.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Boundaries, no secret inheritance, failure paths |
| Integration | yes | Native handoff and actual Git/journal behavior |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | No secret, trust or patient data exposure |

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

Existing operator-owned subjects must not be stolen. Qualification must not reset claims/budgets or execute reviewed source; unknown publication outcomes require reconciliation. Subscription authentication can be expired and must not silently use API billing.

## Gate Status

READY FOR IMPLEMENTATION
