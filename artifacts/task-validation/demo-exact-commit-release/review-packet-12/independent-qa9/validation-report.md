# Independent QA9 validation report

**Result: READY FOR CODEX QA.** The requested existing proactive end-to-end HTTP/PostgreSQL test file passed on the current source snapshot: 23 tests passed, 0 failed, exit code 0. The test output itself records test U passing after 1,155 ms. This is focused evidence for this file only; it does not establish full backend, frontend, browser, native-suite, provider, merge, deployment, or clinical-issue closure.

## Scope and inputs

- Source checkout: `/workspace/clinicos-demo-exact-release`, HEAD `57c192513dcf7cf55853381ac7337926cbdc90cb`, clean at final check.
- Author target: `backend/src/proactive/__tests__/proactive-e2e.test.ts`, SHA-256 `81d10c2fa518edfe76625dbcbd5ccd8404d0a00750abb22a32e630ab83d0cd90`.
- QA contract: `artifacts/task-validation/demo-exact-commit-release/codex-followup-7/task-contract.md`. Author preservation manifest reports 104 records and 0 changed records; author static validation receipt is retained with its original hash.
- Private execution snapshot: `snapshot/`, copied from source HEAD for backend, relevant manifests/configuration, schema, and migrations. Dependency links were read-only; only the generated Prisma client was copied/generated privately.
- Runtime helper amendment: only the private snapshot copy of `backend/src/authz/__tests__/harness-support.ts` was changed to bind the self-contained test server to `127.0.0.1`. Its source hash was `93c7ca500209893f0962b938b0a52353dcfc67bba6dbb917652472bf633abad4`; private runtime-helper hash is `7917eaa4c69d3414011278dc791efa6bf66625e208004d045ebc3ac5f3d81271`. This is a harness-only amendment; no source worktree or test target change was made for it.

## Results

The one-file command was `node --import tsx --test backend/src/proactive/__tests__/proactive-e2e.test.ts`, run in verification environment mode with `DATABASE_URL` pointing only to the owned database on `127.0.0.1:55432`. Its exact command/stdout/stderr/exit receipt is `attempts/runtime-003/017-single-existing-proactive-http-pg-file.json` (SHA-256 `f68771bd26ecb3e685de0c7dbe5f5728d034702e4cfe9ca3db2830019e2f0b48`). TAP reports 23 tests, 23 pass, 0 fail, 0 skipped/cancelled/todo, exit 0.

Test U passed with its authored assertions intact: the 403 forbidden response's request ID is checked, audit lookup waits for the exact operator/outcome/request ID, the persisted audit row is checked before summary assertion s1, and the original summary ID, acknowledgement, 1,100 ms, and status checks remain. The in-test exact request correlation and persisted-row assertion are the primary evidence. The watcher was auxiliary: it started with 0 prior rows and observed one current denied row for synthetic operator `SIM-OSS-1`; therefore this fresh database did not reproduce the historical stale matching-row setup race. The watcher observed the same current denial, but it is not the basis for the pass and its collector summary field is not relied upon.

The private PostgreSQL 16 container used the pinned preloaded image, tmpfs data, an owned synthetic database, and a dedicated bridge with host publication restricted to loopback. Database connectivity passed and all 58 migrations applied. No provider, credentials, persistent test server, browser, frontend, mock-provider service, or real network action was used. The existing test harness's own self-contained loopback server supplied the HTTP app.

## Preserved setup failures and evidence limits

Two setup-only attempts preceded the passing run. Attempt 1 used an internal-only Docker bridge; migration deployment failed with Prisma P1001 because the host could not reach the database at `127.0.0.1:55432`. Attempt 2 used the authorized dedicated bridge and loopback publication, but its external probe script could not resolve package `pg`; it failed before migrations or the test file. Both owned containers/networks were removed, ports returned free, and the baseline database stayed healthy and unchanged. Their individual receipts remain under `attempts/runtime-001/` and `attempts/runtime-002/`.

The lifecycle script wrote an aggregate result to a hard-coded runtime-001 path on each attempt, so that aggregate is not a reliable per-attempt record. This report uses the immutable per-command receipts in each attempt directory, including the exact passing TAP receipt, and does not reconstruct stdout or count the failed setup attempts as test runs. The successful run is the only execution of the test file.

## QA gate disposition

- Contract/input integrity: PASS.
- Static scope and preservation: PASS; only the test U block in the author source diff, with unrelated existing assertions retained.
- Relevant existing test file against isolated HTTP/PostgreSQL: PASS, 23/23.
- UI/browser validation: not applicable to this test-only change and not run.
- Synthetic-data/security boundary: PASS for this run; isolated synthetic database and loopback-only runtime.
- Overall: READY FOR CODEX QA. This report is not a merge, deployment, or clinical closure claim.

## Cleanup and final integrity

The owned PostgreSQL container and network were removed. Ports 55432, 3447, 5447, and 8432 were free; the exclusive lock was free. Baseline container `9000f70d4ee95b9e3bde723796daa050081db4274d20c97888413479232949ad` remained running and healthy with its original image. The source checkout remained at the authorized SHA with a clean worktree. Detailed receipts and proof bindings are in `attempt-index.json`, `summary.json`, and `STOP.json`.
