# Validation Report

## Outcome

Cycle 9 is **PASS for branch publication**. The handover read path is bounded, scoped before
limits, keyset-paginated and backed by exact summaries. Patient detail can no longer present a
20-row page as a complete history, and failed dashboard reads are never rendered as real zeroes.
Production deployment is not claimed: the local host has no Vercel credentials/project binding,
and production Entra plus target PostgreSQL gates remain external prerequisites.

## Security and data authority

- GET feed/overview require authentication and send `private, no-store`.
- Operator visibility is verified creator OR verified assignee; admin/manager is facility scope.
- Legacy rows with nullable actor IDs are admin/manager-only.
- POST derives patient, creator and assignee labels from database IDs. Unknown/spoofed fields fail.
- PUT/DELETE apply author/assignee/admin rules and return non-enumerating 404 for foreign records.
- AI and voice share the authoritative create service and apply actor/patient SQL scope before
  counts, samples and limits.
- Basic diff secret-pattern scan: 0 findings.

Independent review receipts:

- security audit: PASS, no cycle-9 P0/P1;
- UX/performance audit after remediation: PASS, no residual P0/P1.

## Functional and build evidence

| Gate | Result |
| --- | --- |
| Backend production build / TypeScript | PASS |
| Frontend production build / TypeScript | PASS |
| Frontend regression | PASS, 176/176 |
| Focused backend serial integration | PASS, 7/7 |
| Fresh PGlite schema | PASS, all 30 migration SQL files from empty |
| Backend scoped lint | PASS, 0 findings |
| Frontend scoped lint | PASS, 0 findings |
| `git diff --check` | PASS; only configured LF/CRLF warnings |

The HTTP integration fixture covers unauthenticated access, cache policy, two keyset pages,
search, overview, legacy/admin visibility, authoritative writes, IDOR, malformed bounds,
cursor/filter mismatch and a worst-case page made from 20 notes of 4,000 characters.

## 100,000-row PostgreSQL-compatible benchmark

Command: `node scripts/benchmark-consegne-feed.mjs 100000`, 25 measured runs per query, local
PGlite PostgreSQL-compatible engine, gate p95 < 150 ms.

| Query | p95 | Rows/payload | Required plan |
| --- | ---: | --- | --- |
| First actor page | 2.92 ms | 21 raw rows, 9,085 B | creator + assignee indexes |
| Deep keyset cursor | 4.93 ms | 21 raw rows | creator + assignee indexes |
| Full-text search | 7.49 ms | 2 rows | actor + GIN FTS indexes |
| Status + priority | 4.89 ms | 21 rows, all active urgent | filter checked |
| Facility overview | 35.25 ms | 1 exact row | bounded aggregate |
| Operator exact summary | 1.63 ms | 1 exact row | expected counts checked |
| Operator workload | 45.24 ms | 150 groups | constant response groups |
| Patient summary | 1.79 ms | 1 row | patient/status index |
| AI snapshot | 3.59 ms | 5 rows | scoped then limited |
| Worst-case note page | 3.03 ms | 20 rows, 87,932 B | payload < 100 kB |

Expected and actual operator summary matched: total 1,000, open 1,000, in progress 334,
urgent open 0. Benchmark failures: none.

## Explicit limitations and release gates

- The 1,000,000-row run was attempted locally but PGlite fixture/index maintenance did not finish
  in a useful time. The repeatable script accepts up to 1,000,000 rows; that scale gate must run
  on the target PostgreSQL service before production promotion. No 1M PASS is claimed.
- A broad 388-test AI run launched all DB suites concurrently against the in-process socket:
  384 passed and four failed after connection/fixture interference. The affected cycle-9 tests
  pass in the focused serial run. This is recorded as a test-harness concurrency limitation, not
  hidden as a green full-suite claim.
- Whole-file React compiler lint still reports pre-existing ref/access-order debt in `App.tsx`
  and `PatientDetail.tsx`; scoped lint for the cycle's bounded-feed modules is clean.
- Production deploy requires real Entra configuration and an authenticated Vercel project link.
  `vercel whoami` found no local credentials and `.vercel/project.json` is absent.

## Rollback

Revert the cycle commit and migration application before promotion. The migration only adds
nullable actor ID columns and indexes; it does not rewrite or delete legacy rows.
