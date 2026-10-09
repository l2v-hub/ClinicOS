# Task Contract

## Task
- Title: 420-import-recovery
- Slug: 420-import-recovery
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Issue #420 (original issue and comments saved locally): an unavailable import session shows a generic expired/deleted/concluded message while its footer and close label promise saved pages are preserved. Explicit replacement already worked in the audit. Baseline source: fa028c11ffe5dbfe514df8110e6ccf7f6b977602. Preserve unrelated dirty launcher/config changes and the primary checkout. Root is the sole application writer; separate read-only architecture and a new independent QA session.

## Expected Behaviour

Only verified recoverable sessions may advertise resumption within availability/retention limits. Known terminal DTO states have distinct explanations; masked 404 means unavailable, not proven deletion. Temporary failures retain the opaque identity and offer retry without automatic replacement. Explicit replacement announces creation and success, with a visible return path. No backend, OCR/provider, credentials, auth policy, database or issue #421 empty-workspace redesign changes.

## Acceptance Criteria

- AC1: Unavailable or unverified states have no saved-page conservation promise, including close accessible name and stale state after polling/mutation. Known expired/cancelled/confirmed DTO states are explained distinctly; missing/masked GET 404 is neutral.
- AC2: Explicit new session has pending creation feedback, successful creation feedback, stable opaque identity on client close/reload, and a visible keyboard-accessible return action. Failed creation retains its idempotency key.
- AC3: Separately test expired, concluded, deleted, masked missing session and temporary HTTP/network failure. Temporary recovery retries the same ID and never auto-creates. A result/page 404 alone does not classify the whole session as deleted. Test normal active saved-page recovery, expiry display, terminal polling/mutation and desktop/mobile layout.
- AC4: Record the actual scope as contradictory recovery presentation; baseline and candidate show explicit replacement functioning. Do not claim a general import failure or premature expiry fix. No live OCR/provider or clinical production test writes.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Pure presentation, session error classification, existing memory/idempotency regression; focused and full suite baseline delta |
| Integration | yes | Actual app/compiler, independent build/types, modal API fault paths |
| API | yes | Frontend API adapter responses fully mocked; no backend route changes or real provider calls |
| Playwright | yes | Original four criteria, desktop/mobile, keyboard, live feedback, error paths; root and fresh independent QA plus compiled deployment |
| Persistence after refresh | yes | Opaque browser session reference and fixture saved page identity after close/reload; NOT a database persistence claim |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | Import recovery UX only with synthetic session metadata and page bytes; no processing/provider calls |
| Security/privacy scan | yes | Diff review, scoped scanner baseline delta, evidence secret/PHI check, no auth bypass/config changes |

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

404 masks missing and forbidden sessions: do not reveal ownership or assert deletion. Terminal errors in nested resource calls must not erase the actor-scoped opaque reference. Past expiry timestamps alone do not prove server cleanup. Confirmed originals may be archived: say import concluded, not that all clinical documents were deleted. Keep failed creation idempotency and normal resume. Tests intercept all clinical API traffic before network; only deployment static GET/health are live. Preserve preliminary failures separately and seal exact independent source/run artifacts. Full suite has 12 known baseline failures; no new failures allowed, never claim global green. Production release and issue closure require root independent release receipt, exact READY source deployment and pinned synthetic screenshot proof.

## Gate Status

READY FOR IMPLEMENTATION
