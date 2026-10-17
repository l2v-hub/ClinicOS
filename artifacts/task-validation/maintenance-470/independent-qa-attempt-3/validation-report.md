# Independent QA — maintenance #470 candidate 3

**Verdict: BLOCKED.** Security finding F3 blocks publication/remote execution. Correctness findings F1 and F2 also fail acceptance validation. Do not dispatch this candidate. No ledger, source, issue, PR, credentials or remote data was modified by QA.

## Findings

- **F1 — high, false cache-cleanup verification.** `scripts/maintenance/demo-storage-backups.mjs:442` sends two `deploymentRestart` mutations and accepts their boolean acknowledgements. Lines 457–476 accept any backend `/ready` HTTP 200 and set `sourceStorageVerified=true`. There is no postrestart native identity query, proof the old backend/runtime instances stopped, fresh-process proof, runtime health check, or postrestart source-directory inspection. Independent reproducer keeps native instance identity unchanged and serves a stale ready200; the actual function returns verified=true. This violates AC5 and can leave old clinical jobs/caches serving. Require bounded convergence to independently verified new unique instances for both exact services, old-instance termination and actual health; inspect the new source filesystem or use an explicitly approved/proven ephemeral-container replacement method. Never equate request acceptance with completion.

- **F2 — medium, database persistence binding incomplete.** `scripts/maintenance/demo-storage-backups.mjs:211` selects the unique volume solely by database service ID. Its mountPath is retrieved but never compared with the actual PostgreSQL data directory or verified persistence configuration. A synthetic volume mounted at `/unrelated-not-postgres` is returned as a verified database volume, permitting its snapshots to be treated as full database-backup coverage. AC6 requires the actual database volume and unknown persistence to fail closed. Validate the verified PostgreSQL data-directory configuration against the exact mounted volume (including safe subdirectory containment); reject unrelated/ambiguous/nonactive volume mounts before snapshot mutation or complete-coverage claims.

- **F3 — high, unsafe media can be uploaded after hard timeout.** `scripts/maintenance/demo-online-empty-browser.mjs:84` starts video before login and before emptiness proof, directly in the workflow artifact directory. Cleanup at lines 198–202 only runs if JavaScript finally completes. `.github/workflows/deploy-backend.yml:137` uploads that whole directory with `if: always()`, including after the verifier's four-minute step timeout. A controlled SIGKILL reproducer invoking the real verifier with a synthetic Chromium fixture leaves a precheck media file and no `online-result.json`; this is a failure-path fixture, not actual browser evidence. An unexpected real nonempty page or partial trace could therefore be published after cancellation/crash. Record into private staging outside every uploaded path; atomically publish only a completely verified and revoked evidence bundle. Independently gate media upload on that successful completed verdict. Preserve a safe allowlisted failure summary separately. Add abrupt-termination/failed-revocation tests.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: issue and comments reviewed; acceptance extracted independently | `task-contract.md` |
| 1 Diff review | FAILED VALIDATION: F1/F2; source scope otherwise restricted | findings above; `workflow-scope-result.json` |
| 2 Build/tests | PASS execution, but does not override defects | `unit-results.txt`, `negative-results.txt`, `runtime-results.txt`, `frontend-build-result.json` |
| 3 Internal Playwright | PASS: actual synthetic function/PG results, 98 concrete value assertions including reload, zero console/page/HTTP errors; defects displayed honestly | `internal-result.png`, `trace.zip`, `video/page@7b3d5b1f6319d3fff899bcd47b9b6b45.webm`, `playwright-report/index.html`, `test-results/browser-results.json` |
| 4 Security | BLOCKED: F3 artifact confidentiality; F2 persistence uncertainty. Other checks below passed | reproducer in `negative-boundaries.test.mjs`, `negative-outcomes.json` |

## Independently executed checks

- All 13 frozen source/contract hashes matched before and after checks. The immutable read-only inventory retains SHA256 `ea94b7ff88a2570eb57c7e86c2b5ff64544a99d67f6be42d2451d2ad8d833bb1`.
- Existing unit/security suites: **30 passed, zero failed/skipped**.
- Independent negative suite: **8 passed**, including three explicit defect reproductions. A passing reproduction means the defect exists; it is not a passing acceptance criterion. Other negatives reject malformed/missing source markers, contradictory empty counts, raw sensitive SSH errors, multiple active deployments, wrong branch, and wrong online auth mode.
- Full 43-table actual PostgreSQL **16.15** integration: **1 comprehensive test passed**, zero failures/skips. Disposable own container `clinicos-qa-independent470-cleanup3`, loopback port55474, removed afterward. Exact observed FK graph reproduced from sanitized inventory, with restrict/cascade/self relations, mixed/orphan data, rollback of all43 tables, preserved13 content, append-only trigger restoration, row-delete guard untouched, unknown catalog/unknown truncate/preserved inbound/cross-schema/disabled internal trigger/invalid constraint/RLS rejection, real truncate30 and independent fresh read-only zero-data result. Actual counts and invariant output: `runtime-outcomes.json`.
- Complete Docker startup→integration→teardown→browser lifecycle held `/tmp/clinicos-browser-qa.lock`. Existing dev database on5432 was never touched.
- `cd frontend && npm exec -- tsc --noEmit && npm run build`: exit0, 739 modules, build29.83s. Only existing bundle-size/plugin timing warnings. Recorded actual terminal session9525 in `frontend-build-result.json`.
- Actual system Chromium and FFmpeg were used for the safe internal QA surface, with a dedicated per-group browser cache. No shared NSS trust changes, insecure TLS flags, external font calls, live credentials, or real patient fixtures.
- Workflow comparison removes only newly added operation choices and new demo jobs, then asserts byte equality with baseline: all previous production and read-only inventory jobs are unchanged. `git diff --check` passed.

## Security review

- Secrets/PHI/logs: no actual credentials or patient rows in the source diff or QA evidence. CLI failures project allowlisted codes; unexpected raw SSH errors do not leak. SQL reports only counts/metadata/invariants. All local records are explicitly synthetic. **Artifact confidentiality remains blocked by F3.**
- Inputs/AuthZ/targeting: exact branch, demo/project/service/domain/private DB guards; unknown FK/catalog/volumes fail. Main/wrong runtime cannot mutate. No application routes, auth bypass, CORS, VITE_API_URL, schema or production jobs changed. **Actual data-volume binding remains incomplete (F2).**
- SQL/injection: operational direct SQL is explicitly required by the user's authorized data cleanup and is the justified exception to the generic application Prisma-only preference. Identifiers are quoted and constrained to the exact43-table catalog; explicit30-table TRUNCATE has neither CASCADE nor RESTART IDENTITY. Only four known statement-TRUNCATE guard names/functions may be temporarily disabled, restored in the transaction. Actual rollback and preserved-content invariants passed. No user-provided SQL runs.
- Dependency/config: no product package/lock/schema changes. Browser pinned Playwright1.61.1; worker pg8.16.3 follows the previously reviewed inventory launcher. Existing production workflow byte-for-byte preserved.
- Native CLI/schema: independently verified official railwayapp/cli tag v5.66.0. `latestDeployment.instances{id,status}`, RUNNING enum, volumeId, deploymentStopped and ssh `--deployment-instance` are supported. Native SSH quotes each of multiple remote argv words, so the Node -e invocation preserves its intended argument. This does not prove project-token SSH permission; actual denied access must remain a concrete blocker.

## Operational fallback feasibility, not an implementation approval

Official Railway docs at source tree `166e6d1b1eb53fa7a2ca551e9b3c1e5097ab72ed` state that files outside volumes do not persist across deployments, a redeploy creates a new deployment with exactly the same code/build/deploy configuration, and old deployment shutdown follows overlap/draining. Sources:

- https://github.com/railwayapp/docs/blob/166e6d1b1eb53fa7a2ca551e9b3c1e5097ab72ed/content/docs/services.md
- https://github.com/railwayapp/docs/blob/166e6d1b1eb53fa7a2ca551e9b3c1e5097ab72ed/content/docs/deployments/deployment-actions.md
- https://github.com/railwayapp/docs/blob/166e6d1b1eb53fa7a2ca551e9b3c1e5097ab72ed/content/docs/deployments/deployment-teardown.md

Thus an explicitly authorized fallback could replace only the exact existing backend/runtime containers once zero application/runtime volumes and no external persistence are proven, preserve the existing revision/config, verify new deployment/instance identity and old termination plus actual health. The official v5.66 schema exposes `deploymentRedeploy(id,usePreviousImageTag:Boolean)` but the reviewed public docs do not independently establish immutable image-digest semantics for that optional flag. Require actual sanitized same-image/revision proof, or an explicit root-approved same-code/config operational addendum. No code/contract was changed to add this fallback, and no live operation was performed.

## Handoff

Root must reserve any correction as attempt4 under the existing ledger, preserve this failed candidate's evidence, and have a fresh dedicated session validate the immutable corrected candidate. Actual SQL/storage/backup/online gates remain unexecuted. Do not close #470, publish media, or claim the public demo fully cleaned from these synthetic results.
