# PO-05 backend handoff

Baseline: `ef562bf51f296153ff0ec51ed6ab620da8e2dc1a`; branch `codex/po05-import-runtime`; sole writing worktree `C:/Workspace/ClinicOSHouse-worktrees/po05-import-runtime`. Implementation complete for root integration. No commit, push, deployment, live database, provider call, credential change or package/lockfile edit was performed by this worker.

## Implemented

- Persistent original files and stable page/group manifest; real PDF counts; 30 pages/originals/groups; 25 MiB aggregate uploads and bounded multipart streams including chunked requests. SHA-based DB originals, no disk prerequisite. Duplicate/identical operations preserve revision and run; request receipts precede revision CAS. Replacement credits only fully unreferenced originals.
- OCR checkpoint per page, validated extraction per group, existing `mergeExtractions` for all groups. Input hashes include source/config and completed OCR output digests. Distinct queued_pages/processing_pages states, token/revision/lease fencing, expiry-only reclaim, partial retry. Runtime echo attempt/hash validation and pre-persisted run/retry attempt support lost responses; truncated/incomplete/invalid-schema output cannot complete.
- One original/PDF cache per run, verified on miss against the original descriptor, evicted before the next source and cleared in finally. Deterministic page-PDF metadata makes retries byte-stable. Existing source PDFs are reused when a group is their complete ordered page set.
- Source-bound conflict decisions; deferred therapy cannot prescribe. Per-letter parsing avoids manufactured headings. Exact duplicate rows retain aggregate provenance; changing group order cannot create duplicate proposals. If a structured therapy conflict cannot be mapped to a raw row name, the group decision gates that row conservatively.
- Draft version CAS and replay, explicit refresh preserving all manual fields and reviewed therapies, sourceOutdated verification, explicit add/defer proposals. Server-managed source fields cannot be overwritten. Both confirmation entry points check the current source/review; legacy/manual drafts bypass page-only PDF preparation.
- Originals and group PDFs archived in the existing confirmation transaction after source recheck; deterministic IDs and owner/hash checks prevent duplicates or cross-patient collisions. Failure rolls back patient, therapy and archive writes. Cancel/expiry invalidate the run and remove temporary originals/results/checkpoints/receipts, preserving an existing draft. Successful mutations and current worker heartbeat renew TTL; GET does not.

## Validation

Final suite: **101 passed, 0 failed** in `final-suite.log` (13 new PostgreSQL-native scenarios and 88 selected regressions). All isolated clusters were closed by the fixture. New tests cover real PDF byte/order/cache behavior; failure at page17; lost create/run/retry responses; runtime restart404; attempt mismatch; disguised truncation; invalid output schema; worker fencing and lease ownership; replay/no-op; select/defer; refresh/CAS; duplicate therapy after reorder; original/group archive and replay; transaction rollback; cancel/expiry/TTL; concurrent legacy and page-session draft/job confirmation.

`typecheck-final.log`: backend `tsc --noEmit` exit0. `schema-validate.log`: Prisma schema valid. Changed application modules and new tests are under500 lines; the pre-existing legacy job-service/schema sizes are unchanged in scope. `git diff --check -- backend prisma docs tests` passed. Unrelated `run-claude-queue.ps1` and `start-claude-team.ps1` were left untouched and are excluded from the handoff.

Command (synthetic unreachable DATABASE_URL set before Node, with each DB fixture replacing it before Prisma import):

```powershell
$env:DATABASE_URL='postgresql://po05:po05@127.0.0.1:1/po05_unreachable'
node --import tsx --test --test-concurrency=1 tests/integration/po05-backend.test.mts tests/integration/po05-draft-archive.test.mts tests/integration/progressive-intake-db.test.mts tests/integration/intake-legacy-isolated.test.mts tests/integration/po05-legacy-draft.test.mts backend/src/ai/__tests__/merge.test.ts backend/src/ai/__tests__/upload.test.ts backend/src/intake/__tests__/parse-discharge-therapy.test.ts backend/src/intake/__tests__/legacy-document-archive.test.ts
node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit
node node_modules/prisma/build/index.js validate --schema=prisma/schema.prisma
```

## Known baseline test limitation

The separate `backend/src/intake/__tests__/confirm-therapy-validation.test.ts` mock suite has five pre-existing failures (one test passes). The mocks omit the transaction `$queryRaw` used by baseline confirmation and expect the older pre-transaction validation flow. `reproduce-baseline.mjs` extracts baseline route/confirmation from the exact commit, rewrites only imports for isolated evaluation and reproduces the same five failures in `baseline-mock.log`. These are not counted as passing. No clinical validation was weakened to accommodate the stale mocks. Earlier diagnostic PGlite race failures were resolved by bypassing page preparation for legacy drafts; both final PGlite and native PostgreSQL races pass.

## Integration inputs and authority

Use only `sourceFiles` in `handoff-manifest.json`; its SHA256 tree binds tracked and untracked changes. `testInputs` binds unchanged schemas/tests used by validation; `evidenceFiles` lists the compact receipts. Do not copy temporary DB clusters, scratch diagnostics or node_modules. The copied `tests/fixtures/po05-postgres.mjs` is identical to root's helper and may already exist in integration.

Root owns the pdf-lib1.17.1 dependency/lockfile changes, browser checks, production gate and publication. Prisma7.10.0 was generated into this worktree's **local** `backend/node_modules/.prisma/client` using an evidence copy of the schema with an absolute output path and synthetic DATABASE_URL:

```powershell
node node_modules/prisma/build/index.js generate --schema=artifacts/task-validation/po-05-scansioni-lunghe/backend/schema.prisma
```

No generation targeted the shared node_modules. Root must adapt the isolated output path when generating in integration. Source schema remains generator-default. Runtime contract requires version2 echo support before V1 work can execute.

The local development decision is the root's explicit delegated GO, recorded under Ruflo claim `PO-05-backend`. The earlier policy tool returned `invalid-policy-request`; this was a technical unavailability, not policy denial or a grant of distributed release authority. Root alone retains integration and release authority. Claim release is captured separately in `claim-release.json` at handoff.

Physical mobile scanning and real OCR/provider accuracy are outside these synthetic tests. Root's independent HTTP/browser/representative-image benchmark evidence remains separate and must be rebound to the integrated source.
