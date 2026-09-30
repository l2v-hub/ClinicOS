# Regression Baseline — Phase 1

Environment: disposable local Postgres 18.4 (embedded-postgres in the session scratchpad,
`127.0.0.1:54329`, UTF8/C collation), fresh database per run, `prisma migrate deploy` of all
migrations, `AUTH_MODE=demo NODE_ENV=test`. **Never** the Railway production DB.
Evidence: `artifacts/task-validation/phase-1-capability-catalog-and-tool-layer/evidence/`.

## 1. Authoritative comparison — serial (`--test-concurrency=1`), fresh DB each

| Tree                                     | Tests | Pass | Fail | Skipped |
| ---------------------------------------- | ----: | ---: | ---: | ------: |
| `origin/main` 76ac4c60 (clean worktree)  |  1396 | 1374 |   21 |       1 |
| `feat/capability-tool-layer` (this work) |  1474 | 1452 |   21 |       1 |

- Failing set: **identical** (diff of the two sorted lists is empty) → **0 regressions**.
- +79 tests, all passing (the Tool Layer suites).
- History: an intermediate post-QA run surfaced 1 new failure (a source-grep contract test in
  `patients/__tests__/clinical-summary.test.ts` pinned the clinical-summary composition in the
  route); it was re-pointed to the shared service with the same intent and the final run above is
  clean.
- The 21 pre-existing failures are the known red tests of the codex line on main (import
  ownership contract, finalize replay, Transfers DB validation, confirmDraft/therapy import
  persistence, …) plus test-side bugs ("Body is unusable: Body has already been read" in
  `patient-diary-scope-pagination`, `therapy-authoritative-write`, `patients-auth`,
  `patient-clinical-scope`). Lists: `evidence/serial-main-failures.txt`,
  `evidence/serial-branch-failures.txt`.

## 2. Default runner (parallel files, shared DB) — informative only

| Tree             | Tests | Pass | Fail |
| ---------------- | ----: | ---: | ---: |
| main, fresh DB   |  1396 | 1358 |   37 |
| branch, fresh DB |  1474 | 1434 |   39 |

The ~16 extra failures versus the serial run are **order/concurrency flakiness** of DB tests that
assert facility-wide ordering or counts while other files insert rows concurrently
(`roster-pagination-db`, `room-filter-db`, `alphabetical-pages-db`, `assessments/catalog-db`, …).
The names vary from run to run (both directions); every "new" name in a parallel branch run passed
when re-run in isolation (e.g. `catalog-db` 3/3, `room-filter-db` 7/7, `roster-pagination-db`
12/12). A second run on a _reused_ DB also fails `mna-presentation-db` because that suite does not
clean its fixed-id fixtures (passes 3/3 on a fresh DB). Neither effect is caused by Phase 1 code.

Recommendation (not done): run DB suites serially in CI or isolate facility-wide assertions.

## 3. Route tests guarding the local refactors (before → after)

| Refactor                                                                         | Route test files                                                                                                         | Before          | After           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- | --------------- |
| administration confirm / not-administered → `therapies/administration-record.ts` | `therapy-authoritative-write`, `therapy-auth`, `therapy-slot-scope-contract`                                             | 3/4 · 5/5 · 4/4 | 3/4 · 5/5 · 4/4 |
| diary create / with-therapy → `patients/diary-write-service.ts`                  | `patient-diary-contract`, `patient-diary-scope-pagination`, `patient-diary-therapy-contract`, `patient-diary-therapy-db` | 34/36           | 34/36           |
| intake draft owner loader                                                        | `ownership`, `intake-draft`, `intake-confirm`                                                                            | pass            | 9/9             |
| documents MIME exports                                                           | document security/pagination/archive                                                                                     | pass            | 18/18           |

Failures before/after are the same pre-existing baseline entries. Source-grep contract tests that
pinned code _location_ were re-pointed to the new module with the same intent (ordering of
validation before DB writes, actor-scoped resolution, no clinical text in logs).

## 4. Tool Layer tests (`backend/src/tools/__tests__`)

`node --import tsx --test src/tools/__tests__/*.test.ts` → **79/79 pass**
(`evidence/tool-tests.log`). 13 files (core pipeline incl. HTTP large-body test), catalog consistency, patients,
diary, narrative, therapy, drugs, assessments, documents, intake, consegne+appointments,
operations, assistant. GUI == Tool business-outcome parity asserted for 45 capabilities.

## 5. Static checks

- `npx tsc -p backend/tsconfig.json --noEmit` → 0 errors.
- `eslint` on all new/changed backend files → 0 problems.
