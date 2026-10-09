# Independent QA contract — issue 424

Original issue and comments read before code: four unchecked criteria, no comments. Candidate 67d21c3e9257a5acb8c9b25130c9417fb92185fb; source baseline b5f471cd2cd56839e7ebbd0d3daf0bbf04791468.

## Impact Classification
Frontend presentation yes; persistence validation of existing contract yes; backend/API/schema/auth/config/dependencies changes no; security yes.

## Current Behaviour
Baseline ambiguous visible Letto action and repeated common explanations. No audit read was saved. Baseline evidence must remain source-bound, not inferred from candidate.

## Expected Behaviour
Explicit action Conferma lettura, authoritative server reader and full date after saving/refetch, separate clinical urgency action, compact cards with one optional collapsed guide.

## Acceptance Criteria
1. Command describes action, both visible and accessible. Role, author, busy, capability and keyboard guards retained.
2. Saved server identity/role/acknowledgedAt displayed after refetch and reload. Real fresh local PostgreSQL separately verifies durable contract; mock reload alone is not DB evidence.
3. Read is not clinical takeover or completion; purpose read leaves urgency active and note status unchanged. Ho capito remains independent.
4. Brief notes retain complete identity/date/severity/content with reduced source-bound height desktop/mobile and no repeated common explanations or horizontal clipping. Native contextual guide once per list.

## Test Plan
Full diff independent review; focused tests, frontend/backend types, actual compiler build and full regression exact accepted 12-failure comparison; temporary Prisma output and fresh loopback synthetic PostgreSQL 12 tests; guarded actual SPA browser fixtures, source-bound before/after, supplemental independent author/capability/malformed/hostile/direct-chart checks. Single browser lane only after root FREE. No production patient/provider writes.

## Evidence Plan
Preserve all successful and failed runs, immutable recipe hashes before execution, physical source before/after, screenshots/video/trace/results/report. Scoped security and configured credential/expanded ZIP scan, synthetic fixtures; no full human PHI or device certification. Parent owns publication/closure.

## Gate Status
READY FOR IMPLEMENTATION
