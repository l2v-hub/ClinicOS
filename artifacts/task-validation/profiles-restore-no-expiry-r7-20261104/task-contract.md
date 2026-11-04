# Task Contract

## Task
- Title: profiles restore no expiry r7 20261104
- Slug: profiles-restore-no-expiry-r7-20261104
- Type: bugfix
- Date: 2026-11-04

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

Current source E2 4436239a003a44972eb3d80bdcf33c6c292bfab3 / PR525 has genuine Claude Max4 changes-requested, report SHA256 ebfa55b69e7940d880ad8552f5b432fddebf9b0e7445dc19adf7f4f0efd406bf. Five private synthetic cases independently demonstrated that the still-shipped 2029 controller accepts authorization with one in-memory state write while a no-expiry stage is claimed, write-intent, uncertain, staged or lacks execution. Its prior-operation/digest and cross-kind nonce scans omit demoAuthNoExpiryStages. No live provider mutation was observed. Public app remains expired; this contract cannot claim online restoration.

## Expected Behaviour

Address that exact finding without deleting historical code, records, attempts or evidence: include all no-expiry stages in the old 2029 controller's prior-operation digest and cross-kind nonce identity scan. Refuse every state except explicitly blocked-before-write before any authorization/state/provider write. Reject duplicates, drift and changes inside asynchronous guard boundaries; absence preserves all existing 2029 tests. No auth/frontend/policy/Prisma/secret changes are needed. The current actual user reply authorizes implementation7 plus one genuine Max5, retaining six spent implementations/four real reviews and the existing protected release gates. Root alone records native extension/adoption/request/merge/deployment; no reviewer/author can self-approve or deploy.

The original full restoration contract and all AC remain applicable: all five original server-owned passwordless profiles, distinct policy permissions and all existing app functions, no service cutoff, bounded signed sessions/revocation, explicit synthetic environment only. Actual public source/deployment/chooser proof remains required before issue closure. Phase2 development consolidation starts only after restored current access.

## Acceptance Criteria

- AC1: Actual 2029 controller rejects no-expiry claimed, write-intent, uncertain, staged, missing and invalid execution states with zero synthetic store/provider writes and no consumed authorization.
- AC2: Include blocked-before-write no-expiry history in prior-operation digest; reject history/source/nonce changes, duplicate cross-kind nonces and cross-subject records at every reachable guarded transition, including changes inside async observations.
- AC3: Existing finite/2029/no-expiry operations tests remain unchanged and pass when no conflicting operation exists; safe absent/blocked-before-write controls remain functional.
- AC4: Only old2029 controller plus focused tests and new immutable revision7 evidence change from E2. Preserve all previous packets, six implementation entries, four genuine reviews, counters, owner nonce, parent linkage and online hold.
- AC5: Independent QA, exact-head CI, genuine exact-head Claude Max5, and independently reserved final Codex QA precede a protected source-equal merge; no admin bypass, approval transfer or replay of a consumed round.
- AC6: Stage exactly the previously reviewed two nonsecret demo keys, then separately authorized exact-source deploy; actual public status has enabled simulator, null effective expiry and all five working passwordless profiles with their policy permissions on desktop/mobile. No clinical writes or raw-token traces; user local files remain intact.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Five-case RED to GREEN, nonce/digest/drift/race guards |
| Integration | yes | All old/new controller and native-state proof tests |
| API | no | |
| Playwright | yes | Existing source-equal built App auth evidence retained; actual public profile proof required after release |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | No secrets, PHI, reset, permissive fallback or source/budget bypass |

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

Retain the real Max4 finding/RED output and its consumed round; no mutable edit to existing packets. Native grants are separately consumed actual host-session bindings, not JSON/PAT permissions. No live Railway/Vercel/provider/controller changes by the author/QA. Root executes only after current exact-source gates. All generated QA data is synthetic; do not touch shared patients, DB/storage cleanup, unrelated issues or the dirty primary checkout.

## Gate Status

READY FOR IMPLEMENTATION
