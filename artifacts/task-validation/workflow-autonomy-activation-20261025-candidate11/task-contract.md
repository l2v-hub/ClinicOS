# Task Contract

## Task
- Title: Controller actual Claude review followup 504
- Slug: controller-actual-claude-review-followup-504
- Type: bugfix
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

Address all three findings in genuine Claude report 6390967525, request 310c111d-3c1e-4424-a930-691584bbebde and exact head 26a4137814f47c78d590f1b4dfe928d480e92909. Preserve source trust/human approval gates, attempt history and explicit continuation authorizations. Real scope failures mark progress and attempts definitively failed without reusing invalid outputs; correction no-change settles attempt; typed evidence failures; authorized exact-digest/round journal settlement once with no extra model allowance. Existing review round2 remains changes-requested until verified new head and genuine next review.

## Acceptance Criteria

- AC1: Address all three findings in genuine Claude report 6390967525, request 310c111d-3c1e-4424-a930-691584bbebde and exact head 26a4137814f47c78d590f1b4dfe928d480e92909. Preserve source trust/human approval gates, attempt history and explicit continuation authorizations. Real scope failures mark progress and attempts definitively failed without reusing invalid outputs; correction no-change settles attempt; typed evidence failures; authorized exact-digest/round journal settlement once with no extra model allowance. Existing review round2 remains changes-requested until verified new head and genuine next review.
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
