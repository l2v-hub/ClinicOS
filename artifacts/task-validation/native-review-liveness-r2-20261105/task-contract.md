# Task Contract

## Task
- Title: Resolve the three PR529 Max advisory findings while preserving one permanent development target
- Slug: native-review-liveness-r2-20261105
- Type: bugfix
- Date: 2026-11-05

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend / Backend / Database | no |
| Native reviewer lifecycle / Security / Receipt diagnostics | yes |
| Release policy / Model profile / Production environment | no |

## Current Behaviour
PR529 head65ab406e08327c21d669f2d6ba3e5a871b3459ec has green CI but the actual one-turn Claude Max advisory requested changes: exported TLS key disposal can be skipped, pending startup cleanup can cache success and swallow late failure, and close rejection can mask a structured worker receipt. The advisory is preserved and is not a native approval. PR529 has no native subject; no controller round is invented here.

## Expected Behaviour
Resolve these exact source findings with bounded cleanup and truthful structured outcomes. Preserve prior code/evidence/reviews and every old budget. Prepare a single permanent development environment as the user's working target; current demo remains available until complete verification. Creation or cloning of future production is deferred until the user decides to prepare it.

## Acceptance Criteria
- AC1: Exported ephemeral TLS key material is disposed synchronously on every cleanup path, including rejected/hung resource close. Every owned resource stop is still attempted independently. Directory removal requires proven cleanup and exact ownership.
- AC2: The shared memoized cleanup owns pending startup and the exact returned runtime. Unknown startup or late rejecting/hung close is explicitly cleanup-failed; successful late close occurs once. Synchronous cancellation, capacity diagnostics, one-forward and claim fencing remain intact.
- AC3: Worker staging failure, failed claim and reserved transition mismatch keep their original classification/reservation metadata if close rejects, add sanitized cleanup-failure evidence, remain non-successful and do not retry, forward, refund or claim again.
- AC4: New failure-path tests reproduce the original deficiencies, pass the correction, preserve native guard/capacity/worker regressions, and distinguish mocks from live qualification. No real model or provider call is used in tests.
- AC5: Imported advisory/history is immutable and exact-source-bound. No native round/allowance, human approval, merge, production cloning, deployment or parity is fabricated. Live guard qualification and release dependencies remain explicit.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit / real child processes | yes | Pending startup, cleanup failures, memory disposal, cancellation |
| Mock worker integration | yes | Preserve failed/reserved claim classifications and receipts |
| Native guard and worker/capacity regression | yes | Preserve authorization, output and one-forward invariants |
| Syntax / formatting / diff / artifact integrity | yes | Exact-source review inputs |
| Live model / Docker / cloud DB / candidate E2E | no | Not falsely substituted by these tests; separate qualified release prerequisites |

## Evidence Plan
Sanitized TAP reports and source hashes; original advisory and immutable source history; independent read-only code review; exact tested commit validation report. Preserve failure/unknown evidence without retries. No credentials, clinical data, old issue queue mutations or seed/cleanup operations.

## Ownership and scope
Root integrates in C:/w-rv/native-review-liveness-r2-20261105. Sole code writer source_inventory works in C:/w-rv/native-review-liveness-r2-author-20261105. infra_inventory reviews read-only. Only root edits shared packet/manifest/lockfiles and pushes the reviewed continuation to PR529. New files stay below500 lines; avoid a broad refactor of the already oversized worker solely for this surgical error-path correction. Any new production dependency must enter the native fingerprint rather than becoming an untracked trust root.

## Gate Status
READY FOR IMPLEMENTATION
