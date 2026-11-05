# Task Contract

## Task
- Title: Preserve proven cleanup and truthful post-forward/qualification evidence
- Type: bugfix
- Date: 2026-11-05

## Impact Classification
Native review cleanup/error evidence yes; application, provider deployment, budgets and release policy no.

## Current Behaviour
Actual Max advisory on153540e5a50046d0e46c3184f1bf221a9f857bd2 confirms prior three repairs, but requests changes: proven-clean startup rejection becomes false cleanup-failed; post-forward cleanup failure loses classification and a validated report; qualification discards cleanup-failure classification. Full report is in private review529-r2-Max-report.json. Historical unknown41937588247 must remain unknown and unretried.

## Expected Behaviour
Recognize only an unforgeable in-process factory-proven cleanup signal, preserve truthful cleanup-failure metadata through release/qualification/worker, and retain any already fully validated report solely as hash-bound evidence, never approval. One permanent development remains the goal; production cloning deferred.

## Acceptance Criteria
- AC1: A trusted factory failure after successful cleanup yields ordinary rejection; unknown startup rejection, failed/hung cleanup remain explicit cleanup failures. Prefer private WeakSet branding over free-text claims. No directory removed unless ownership and cleanup proven, no restored forward capability.
- AC2: Post-forward cleanup failure remains failure/nonretryable, one claim/forward/failOwnedClaim only, cleanupFailed metadata in provider-failed and ownership-changed receipts. A fully validated report may be retained with its hash/proof only as evidence, never published/approved or treated as validation success while cleanup unknown.
- AC3: Qualification preserves sanitized cleanup classification into capability-blocked and CLI-failure receipts without qualifying the profile or claiming application source. Ordinary qualification failure must not be labelled cleanup failure. No private text, tokens, diagnostics or raw response leaked.
- AC4: New targeted regressions and native/worker/capacity/evidence/recovery suites pass with accurate platform skips. Test no retry/refund/new claim/duplicate cleanup/forward and retained-report source/hash integrity. No real provider/model/Docker/DB test.
- AC5: Any new production outcome helper is explicitly included in native source fingerprint; new files below500lines, surgical edits to existing large worker. Preserve all source/history/Max outcomes. No allowance or native round assigned, no human approval or deployment inferred.

## Test Plan
Focused new failure-path and real child tests; all native guard/worker/capacity/evidence/recovery regressions; syntax/format/diff checks. Linux-only local factory test must use synthetic credentials and no Docker/model/provider. Preserve current CI as historical when source changes.

## Evidence Plan
Sanitized TAP and exact source hashes, immutable prior Max report and source identities, independent peer review. Explicitly disclose missing live guarded qualification/human approval and current development non-parity.

## Gate Status
READY FOR IMPLEMENTATION
