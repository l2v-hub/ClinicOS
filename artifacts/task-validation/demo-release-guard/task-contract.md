# Task Contract

## Task
- Title: Require exact reviewed deployment on the user's online demo before issue closure
- Slug: demo-release-guard
- Type: infrastructure correctness
- Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6

## Impact Classification
Backend/API yes; Privacy/Security yes; Config/Env yes; Database/Persistence no schema or data changes; Frontend/UI no product changes.

## Current Behaviour
A successful backend workflow for a production-scoped token can satisfy release closure while the actual frontend uses the separate demo environment. Health does not identify the active deployment. Current URL-only records do not verify Actions run or target identity. Ready normal batches automatically release.

## Expected Behaviour
Keep production deployment intact and require a separate explicit demo deployment with trusted source provenance and live deployment identity. Require remote trusted workflow receipt validation before closure. Honor durable release holds in automatic and manual paths, including immediately before merge and publication. No external mutation during implementation.

## Acceptance Criteria
- AC1: Demo upload uses only the existing demo token in its dedicated environment and validates fixed project/environment/service/domain before upload. Production path remains independent.
- AC2: Exact main checkout and successful Railway deployment commitHash must match the merged revision. A sanitized receipt binds Actions run/attempt, target, domain and deployment ID. Missing provenance blocks.
- AC3: Demo readiness exposes only an optional valid Railway deployment UUID and no-store; the deployment workflow verifies it against the successful deployment.
- AC4: Release validates the actual trusted successful Actions run and immutable artifact receipt, exact SHA/ref/repo/attempt, target identity and active readiness before durable deployed status and issue closure. Frontend binding remains required.
- AC5: Durable releaseHold blocks automatic selection, manual merge, post-await merge race, recording and publication without altering four-cycle ledgers.
- AC6: Wrong target/provenance/HTTP response/receipt/run/hold and production-only success cannot close issues. Legacy approved groups need new real target proof.

## Test Plan
Unit and integration tests required: release/helper negative matrix, local synthetic HTTP server for redirect/cache/deployment identity behavior, backend readiness API/dependency tests, full existing bug-pipeline suite. Frontend typecheck/build required by independent QA. No production test data or paid provider calls.

## Evidence Plan
Record source protocol observations, exact commands and results under this directory. Dedicated independent QA must produce synthetic QA-only browser screenshot/trace/video, diff/security review and validation-report.md. Implementation reports only preparatory state; no claim of live activation or review approval.

## Risks
Trusted main must receive the reviewed guard before normal groups are promoted. Existing release instances use old code. No bootstrap approval mechanism is implemented by this task. No secrets read, exported, replaced or logged. No GitHub mutation, commit, push, merge or deployment.

## Gate Status
READY FOR IMPLEMENTATION
