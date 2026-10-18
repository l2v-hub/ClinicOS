# Task Contract

## Task
PR491: Fix both Claude findings in the existing inspection helper: isolate its concurrency group from production deploys and report successful pagination separately from visible-environment accessibility.

## Impact Classification
Reviewed infrastructure/controller correction, explicit owner scope. Same entity and logical history; no new fake batch. Base c7ccc7b5a88ca4c6cb1276319f084293f780e5c6. Claude raw negative feedback is finding data, not a structured approval.

## Current Behaviour
The real Claude report on the base SHA requests changes. Existing source and proofs are frozen. User explicitly authorized continued implementation/review beyond four while preserving all history; old max4 text is superseded for authorized extensions. Root owns remote state, claims, publication and release.

## Expected Behaviour
Fix both Claude findings in the existing inspection helper: isolate its concurrency group from production deploys and report successful pagination separately from visible-environment accessibility.

## Acceptance Criteria
AC1 workflow uses dedicated demo-source-topology concurrency distinct from deploy-backend railway-backend. AC2 successful receipt paginationComplete=true only after bounded complete traversal; allVisibleEnvironmentsAccessible reflects canAccess and may be false; project-wide visibility remains unproven. AC3 every adversarial no-mutation/bounds/ownership/drift/secret guard remains effective. AC4 old proof hashes unchanged, fresh targeted tests and independent safe browser receipt proof pass.

## Scope
Only .github/workflows/inspect-demo-source-topology.yml, scripts/automation/inspect-demo-source-topology.mjs and scripts/automation/inspect-demo-source-topology.test.mjs may change as source. New follow-up packet is owned; old contracts, manifests, QA probes/reports/media are historical and remain byte-identical. Copy/adapt historical probe into this follow-up if needed; do not rewrite it. No provider/source/trigger mutation, app/schema/auth/config secret changes.

## Implementation Plan
Follow the read-only findings matrix prepared before code in /workspace/.clinicos-cloud/pr491-codex-followup-20261018/analysis/. Reserve continuation durably first. Implement surgical fixes and meaningful negative/positive tests. Simplify, format only changed source, then STOP for a NEW independent QA session. No author commit/push/GitHub/state/provider operations.

## Test Plan
Credential-free focused regression suites followed by full relevant existing infrastructure/controller suites. Preserve original tests except real changed contracts. A fresh independent QA reviews full diff, runs targeted suites and verifies a safe local HTML receipt/recovery surface through Playwright with screenshots, trace/video and actual result values/refresh. No app code or paid provider execution. Inherit unrelated builds only after source/config identity verification, explicitly marked.

## Evidence Plan
All fresh packet metadata and media under this codex-followup-1 directory or new owned external QA root. Snapshot old tracked proof hashes before editing and compare after. Each public artifact must be <=25MiB, decoded/CRC-checked and secret/PHI-scanned including all ZIP members. Synthetic only. No copies of private controller states or credentials. QA verdict READY FOR CODEX QA/BLOCKED/FAILED VALIDATION; not release/closure.

## Gate Status
READY FOR IMPLEMENTATION
