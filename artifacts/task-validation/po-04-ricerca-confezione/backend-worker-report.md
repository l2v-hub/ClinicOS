# Task Validation Report

## Task
- Title: PO 04 backend drug search
- Slug: po-04-backend-drug-search
- Baseline: 553fa24bcbcfbf20def0dfa96de06cd52684c9bd
- Candidate: uncommitted scoped files bound by source-files.json; no commit/push/deploy.
- Date: 2026-09-23

## Implementation Summary

Search parses query-only strength/form predicates, filters candidate packages before applying the output limit, and preserves exact AIC identity. The persisted import normalizer is unchanged. Package description strength takes precedence over a same-unit strength in the denomination; a packaging volume does not hide a different-unit concentration in the denomination. No strength conversion or clinical dose inference is performed.

GET /farmaci/cerca retains query/esiti and adds pageInfo {hasMore,nextCursor}. Cursors bind q, pa, limit and sort version v2. Ranking is exact/prefix, then typo fallback if that family had no filtered match, then ingredient fallback if neither prior family matched. The cursor records whether prior pages found matches, preventing a later page from unexpectedly entering fallback tiers. Each tier orders by denominazioneNorm and AIC. A page scans at most 1,024 candidate packages; it can be empty with hasMore=true.

Numeric-brand disambiguation uses narrow existence probes. Exact, AIC and PA searches do not require the global name index. Typo fallback caches at most 30,000 distinct normalized names per Prisma client, with SQL DISTINCT performed in the database. Above that threshold it uses bounded package scans with the same distance predicate and continuation, rather than truncating names or failing the entire search. Legacy array wrappers traverse up to 16 pages; if still incomplete they throw an explicit instruction to use the paged API, rather than returning a false empty array. Current legacy caller is backend/src/scripts/verifica-farmaci.ts, limit 3.

## Files Changed

- backend/src/services/farmaci/query.ts
- backend/src/services/farmaci/search-index.ts
- backend/src/services/farmaci/search-model.ts
- backend/src/services/farmaci/search-page.ts
- backend/src/services/farmaci/ricerca.ts
- backend/src/routes/farmaci.ts
- backend/src/intake/therapy-selection.ts
- backend/src/services/__tests__/farmaci-query.test.ts
- tests/integration/po04-drug-search.test.mts

Unrelated existing changes to run-claude-queue.ps1 and start-claude-team.ps1 are excluded. No manifests, lockfiles, schemas, migrations or persisted normalization were changed. An ignored node_modules junction reuses the integration worktree's installed dependencies.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | 14 misleading 500 mg rows precede AIC 012745170/182; only ordinary 1000 mg tablets match the specified form. Explicit tests distinguish g/mg/mcg, ranges, concentration denominators, effervescent and package volume. |
| AC2 | PASS | Stable full 18-package pagination, query/mode/limit cursor binding, malformed route inputs, empty scan continuation over 1,100 nonmatches and oversized-index fallback without omissions. |
| AC3 | PASS | Existing import/normalizer tests unchanged; numeric brands including B12 with explicit/bare strength, ingredient/typo/AIC lookup, isolated client caches and AIC snapshot equality/removal/mismatch tests pass. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | 14 focused parser/intake-binding and existing import/normalizer tests; search-tests.log. |
| Integration | PASS | 8 PGlite/real Prisma/Express tests; search-tests.log. |
| API | PASS | Existing query/esiti response retained; pageInfo and validation checked through actual router. |
| Backend typecheck | PASS | tsc -p backend/tsconfig.json --noEmit, exit 0; typecheck.log. |
| Playwright | NA | Parent integration owner. |
| Persistence | NA | Parent verifies API/save/reload AIC persistence; local test verifies snapshot binding only. |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | PASS | Query/limit/cursor/mode bounds tested; SQL uses Prisma.sql parameters; existing public-read/rate-limit/admin-write middleware preserved. No full security scan claimed. |

## Runtime Evidence

Final command: node --import tsx --test backend/src/services/__tests__/farmaci-query.test.ts backend/src/services/__tests__/farmaci.test.ts tests/integration/po04-drug-search.test.mts

Result: 22 tests passed, 0 failed, exit 0, 15.57 seconds. All catalog rows are synthetic and the API/socket bind to 127.0.0.1. The integration fixture creates a fresh PGlite database and applies existing repository migrations there; no application migration was authored or executed against another database. It replaces DATABASE_URL before importing Prisma. The other tests use an explicitly unreachable loopback URL.

Dependencies came from the existing integration node_modules installation. This is source/test verification, not a source-bound production build, benchmark or release receipt.

## Logs

- search-tests.log: final successful source-bound focused run.
- typecheck.log: final backend compile check.
- focused-tests.log: earlier broader diagnostic run, 21/26 passed; not final acceptance evidence. The pre-existing confirm-therapy-validation mock does not implement tx.$queryRaw required by baseline confirm-service, so five cases return 503 before therapy validation. Parent acknowledged this fixture mismatch and owns real PGlite confirmation verification; that test was not modified in this scope.
- source-files.json: SHA-256 manifest of all nine candidate source/test files.

## Residual Risks

- Pagination guarantees assume an unchanged catalog. Concurrent catalog imports are not pinned to a snapshot; existing cache invalidation remains on reload, plus the one-hour TTL.
- Very large catalogs can require multiple empty pages during typo fallback. Work per page remains bounded; the UI must keep continuation available for hasMore=true even when esiti is empty.
- Cursor contents are opaque consistency tokens, not authenticated authority. The endpoint serves public catalog data.
- Ambiguous or unsupported strength/form syntax is not a clinical equivalence engine. Multiple explicit strengths in one query are rejected.
- Ruflo policy_evaluate was unavailable for this local task: its attempts returned invalid-policy-request, not an allow/deny result. Explicit delegated local authority and a Ruflo ownership claim were recorded; no distributed release authority is asserted. Root owns integration, real persistence/browser verification and publication.

## Final Decision

CLOSED — VERIFIED

This decision covers only the delegated backend implementation and focused validation described above. Overall PO-04 closure and publication remain with the parent integration owner.
