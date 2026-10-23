# Scope amendment 1 — preserve exact legacy diary replay

Root authorized 2026-10-18 before editing any newly listed path. Same UX447 continuation5, nonce b9c47bef-ce58-4251-b08d-9a75c3bfd8ea. The user-approved route policy and original contract already require compatibility for previously persisted diary replay. The strict shared create validation now rejects missing route earlier than legacy replay lookup; this is a discovered caller-integration dependency.

Add only:
- backend/src/patients/diary-therapy-service.ts
- backend/src/patients/diary-write-service.ts
- backend/src/routes/__tests__/patient-diary-therapy-db.test.ts

The already scoped patient-diary-therapy-contract.test.ts may add meaningful focused regression coverage. Keep existing ACL, authoritative author, validation, transaction and idempotency guarantees. New prescriptions without explicit nonblank route still fail before any create/write; no new global permissive validation or automatic oral route is allowed. A compatibility path may return only an already persisted exact same-patient/requestId/content legacy pair, with the prior documented normalization and conflict semantics. It cannot create a replacement therapy, silently accept changed content, reveal another patient's pair or weaken operator/patient gates. A failed/uncertain lookup must never fall through to permissive creation. Explicit route values stay unchanged. Retain original default only for comparing known existing legacy data, never choosing a route for a new prescription.

Tests must cover exact persisted legacy replay with omitted route and no new writes, changed-content/request reuse conflict, cross-patient separation and missing-route new request rejection/no writes, alongside explicit-route successful create and existing status/edit compatibility. Real-DB tests run later under root-coordinated owned runtime; pure regression tests may run now. All prior9098 proofs and source snapshots remain immutable; copy-before-edit hardlinked source. No parent481/483 merge, dependency/schema/policy changes or unrelated scope.

Root must persist/read back this amendment's SHA256 against the exact active reservation before author edits the newly authorized paths. The original contract/plan remain unchanged; this append-only amendment records the dependency and evidence requirement.
