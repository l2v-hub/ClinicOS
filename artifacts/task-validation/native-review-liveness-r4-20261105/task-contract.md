# Task Contract

## Task
Resolve five fourth-advisory native review findings without additional inference or release authority. Base d3a876dbc005ea16c2c88cf35e5bb3e7ebb23d47; advisory context is incomplete and outcome is not approval.

## Impact Classification
Native review liveness, cleanup, evidence integrity and privacy. No application or deployment changes.

## Current Behaviour
The advisory identifies a CLI self-import top-level-await deadlock, loss of cleanup evidence on uncertain claim failure, unbound/nonreproducible proof, leaked public certificate directory and unsafe evidence projection. Historical run 41937588247 remains unknown.

## Expected Behaviour
Resolve these paths fail-closed while preserving source, request, policy, isolation, single-forward and claim fencing. No live model, provider, Docker, database, native queue or credential operations.

## Acceptance Criteria
- Real child regression demonstrates entrypoint self-import liveness without credentials, provider or Docker, with finite result.
- Failed cleanup and uncertain claim transition retain truthful non-success metadata and never retry or publish.
- Retained proof is reproducible and binds prepared input, exact subject, validated sanitized report, model and native single-forward/isolation predicates.
- Ephemeral public certificate directory is owned, removed on success/failure and removal failure is explicit; private keys disposed.
- Raw reports pass normal safety validation before only four text fields are projected; tracked paths remain exact.
- No native allowance, model call, merge, deployment or approval is claimed. Four advisory calls remain consumed; incomplete context and all historical evidence preserved.

## Test Plan
Offline synthetic real-child, native guard, qualification, capacity, worker, evidence, recovery and security regressions; syntax/format/diff checks. Linux-only certificate factory test marked skipped if unavailable. No live provider or model.

## Evidence Plan
Record exact source hashes, sanitized TAP and skip counts, independent review and unresolved prerequisites. No raw credentials or clinical data.

## Gate Status
READY FOR IMPLEMENTATION
