# Validation report

Status: PASS for the cycle 34 source and local-build gate.

## Implemented evidence

- A shared `patientScopeWhere` predicate now drives both ORM and raw-SQL patient ownership filters.
- `/patients/page`, `/patients/parameters/page`, clinical overview, and requested-ID summaries apply ownership before pagination, `LIMIT`, aggregation, or dependent reads.
- Patient detail, demographic PATCH, enabled DELETE, and GET/PUT cartella use the non-enumerating patient-scope guard.
- Parameter PATCH validates the payload first and then verifies ownership under the existing per-patient transaction lock.
- Patient creation assigns the authenticated actor server-side; duplicate-CF responses no longer return `existingPatientId`.
- The database integration fixture now exercises owner A/B isolation, manager global access, roster/summary projections, cartella and parameter mutations, and authoritative ownership on create.

## Verification

- Focused ownership/pagination/contract tests: 11/11 PASS.
- Frontend regression suite: 213/213 PASS.
- Backend TypeScript/Prisma build: PASS.
- Changed backend ESLint: PASS.
- Changed-file Prettier check: PASS.
- Production dependency audit: 0 vulnerabilities.
- `git diff --check`: PASS.
- Independent security reviewer: PASS, no P0/P1/P2.
- Independent UX/performance reviewer: PASS, no P0/P1/P2 and no N+1 introduced.

## Environment gates and known baseline

- The new owner A/B database integration test is present but cannot execute locally because `DATABASE_URL` is absent; route tests that import Prisma fail at process startup for the same environment reason.
- Whole-backend ESLint remains blocked by two pre-existing irregular-whitespace errors in `backend/src/services/farmaci/import.ts`; every changed backend file passes ESLint.
- Production deploy remains blocked until Vercel/Railway project credentials, target Entra configuration, PostgreSQL access, migration evidence, and rollback authority are available.
