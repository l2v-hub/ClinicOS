# Validation report

Status: PASS for the cycle 28 source and local-build gate.

## Implemented evidence

- Section extraction now enforces per-item, global, and per-section aggregate caps before AJV and duplicate merging.
- Section, annotation, provenance, medication, allergy, and demographic objects are projected to known fields; schema items reject extra properties.
- Narrative metadata is globally bounded before routing and validated per persisted section, including exact offsets, field sizes, page ranges, and enum values.
- Intake autosave rejects attempts to replace `_narrative` or `_sections`.
- Therapy list, daily administration, and medication-history failures render accessible retry states instead of false empty results.
- Daily requests and history requests use sequence/patient guards.
- Medication history uses a 100-row keyset page, opaque cursor bound to the date filter, deterministic ordering, deduplication, and explicit partial-state copy.
- Legacy medication-history reads return `409` when the requested limit would truncate data.
- Migration `20260830000500_medication_administration_feed` adds the matching composite history index.

## Verification

- Backend focused tests: 51/51 PASS.
- Frontend focused tests: 6/6 PASS.
- Frontend full regression: 204/204 PASS across 36 test files.
- Backend TypeScript/Prisma build: PASS.
- Frontend production build: PASS.
- Changed backend ESLint: PASS.
- Changed frontend ESLint: PASS.
- Prisma schema validation: PASS.
- `git diff --check`: PASS.
- Security reviewer: PASS, no P0/P1.
- UX/performance reviewer: PASS, no P0/P1.

## Environment gates

- No target `DATABASE_URL` is available locally, so migration deploy, target query plans, and database-backed integration suites were not executed.
- The new index still requires staging `prisma migrate deploy` plus `EXPLAIN ANALYZE` on a representative medication-history dataset.
- Production deploy remains blocked until Vercel/Railway project credentials, target Entra configuration, PostgreSQL access, and rollback authority are available.
