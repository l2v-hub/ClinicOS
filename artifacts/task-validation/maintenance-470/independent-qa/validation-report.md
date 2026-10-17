# Independent QA — demo inventory #470

**Verdict: READY FOR CODEX QA**

This verdict covers the restricted read-only inventory patch at the source hashes in `source-sha256.json`, against baseline `ca7783718ed6c1834dc87194cbe96093e5bc9517`. It does not establish that the live demo or its backups are empty and does not authorize issue closure. No new-code Railway dispatch, service creation, patient deletion, production operation, GitHub mutation, commit or push was performed by this QA session.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | Live issue #470 body and its one comment read; frozen task contract read and hashed in `contract-review.json`. AC1–AC6 evaluated for this inventory patch. |
| 1 Full diff review | PASS after attempt 2 corrections | Workflow diff and all three untracked implementation/test files read in full. Historical findings `QA470-1` and `QA470-2` recorded in `findings.json`; both resolved and independently regression tested. `git diff --check` passed. |
| 2 Tests/build | PASS | 17 implementation unit tests + one real PostgreSQL integration test independently rerun: 18 PASS, zero failures/skips. Four additional independent failure-boundary tests passed. Frontend `tsc --noEmit`, `tsc -b` and production Vite build passed on an unchanged copied baseline frontend with existing installed dependencies. |
| 3 Playwright | PASS for internal inventory evidence | Safe loopback QA-only surface; 26 exact value assertions before/after reload; zero console, page or HTTP errors. `internal-results.png`, `trace.zip`, `video/`, `playwright-report/index.html`, `test-results/browser-results.json`. Screenshot explicitly states synthetic QA, live inventory NOT RUN, backups NOT VERIFIED. |
| 4 Security | PASS | Checks below. No real data or credentials used. |

## Resolved findings

- **QA470-1, incomplete catalog coverage:** `scripts/maintenance/demo-patient-inventory.mjs:149` freezes the sorted actual catalog before any count query and includes count plus SHA-256. Parent validation at line 343 validates canonical unique catalog/digest and at line 351 requires exact count-table set equality. Regression tests preserve the original header while omitting `ImportJob`, reject extra/duplicate tables, reject incorrect digest/count, and prevent unknown/mixed rows from yielding an empty claim. The digest binds the trusted worker's captured catalog; it is not an independent database oracle against a wholly fabricated worker payload.
- **QA470-2, cleanup starved by workflow timeout:** operation deadline at line 422 includes target verification, deployment and polling; log calls are capped at five seconds; cleanup at line 528 has a separate 90-second budget and requires literal `serviceDelete === true` before an explicit demo project/environment absence check. The three preparatory steps in `.github/workflows/deploy-backend.yml:28` are each limited to one minute. Preparation ≤3 minutes, operation ≤8 minutes and cleanup ≤90 seconds fit within the 15-minute job. Fake-clock slow/failing-log and overrun tests verify exact owned-service cleanup. A forcibly killed host/process remains an external interruption, rather than a claimed guaranteed cleanup; the owned service ID is logged without credentials for recovery.

## Independent execution

Commands executed from the maintenance worktree:

```sh
node --test scripts/maintenance/__tests__/demo-patient-inventory.test.mjs artifacts/task-validation/maintenance-470/independent-qa/runtime-independent.test.mjs
node --test artifacts/task-validation/maintenance-470/independent-qa/failure-boundaries.test.mjs
flock /tmp/clinicos-browser-qa.lock node artifacts/task-validation/maintenance-470/independent-qa/browser-internal.mjs
git diff --check
```

`runtime-independent.test.mjs` copies the actual integration test and changes only its import path plus owned container name/loopback port, avoiding the implementer's container. Official cached PostgreSQL 16 ran as a normal Docker container without mounts or privileged flags at `127.0.0.1:55472`. Real SQL readiness preceded the test. Assertions verified empty patients with orphan import/draft records, every mixed-record category, unknown-table fail-closed behavior, account preservation, read-only transaction write rejection with SQLSTATE `25006`, and rollback/close. The owned container was removed and independently confirmed absent; other containers were untouched (`resource-cleanup.json`).

Frontend verification used a temporary exact copy of this worktree's unchanged `frontend/` inside the owned QA directory, with:

```sh
/workspace/ClinicOS/node_modules/.bin/tsc --noEmit -p artifacts/task-validation/maintenance-470/independent-qa/frontend-build/tsconfig.json
/workspace/ClinicOS/node_modules/.bin/tsc -b artifacts/task-validation/maintenance-470/independent-qa/frontend-build
/workspace/ClinicOS/node_modules/.bin/vite build artifacts/task-validation/maintenance-470/independent-qa/frontend-build
```

The copy and its generated output were removed after the successful run; `frontend-build.log` is retained. Vite's existing large-chunk warning is nonfatal. No dependency installation or tracked frontend write was needed. Browser recording used installed `/usr/bin/chromium` and `/usr/bin/ffmpeg`; no TLS bypass, certificate change or browser download was used.

## Security review

| Check | Result |
|---|---|
| Secrets | PASS — CLI/API outputs captured internally; errors reduced to fixed allowlisted outcomes. Worker receives only a private Railway reference, never an exported credential value. Synthetic local test credentials are fixtures, not account secrets. |
| PHI | PASS — only aggregate counts and catalog/FK metadata queried; all test records synthetic. No clinical rows, document bytes or patient payloads in screenshots, logs or traces. |
| Logging | PASS — projected count/schema fields and owned service/environment IDs only; extra raw row/credential fields stripped. Independent CLI failure assertion verifies fixed error JSON. |
| Validation | PASS — exact project/environment/service/domain/database checks before mutation/connect; bound identifiers and count formats; catalog/count classifications and empty claims independently recomputed. |
| AuthZ | PASS — branch and operation gated; existing demo environment secret only; runtime independently checks exact target and new service identity. Existing production guards remain unchanged. No application auth route is changed. |
| Injection | PASS — maintenance contract explicitly needs catalog/count SQL and read-only transaction controls. Identifiers are catalog-derived, restricted and quoted; no data write SQL or user input interpolation is introduced. The actual PostgreSQL READ ONLY boundary is verified. |
| Dependencies | PASS — no application dependency changes; worker uses pinned `pg@8.16.3`, official Node image and existing pinned Railway CLI. |
| Config/lifecycle | PASS — no public domain, persistent volume, application CORS or production flags introduced. Cleanup removes only the verified newly created service; additional tests reject existing/backend IDs, colliding names and nonliteral deletion success. |

## Remaining live scope

Existing trusted run `39015026575` is baseline evidence for binding/API outcomes only; it is not execution of this new patch. Root must review this exact candidate before any new-code publication/dispatch. Live complete catalog inventory, actual online empty-list screenshot/reload and demo backup removal/verification remain separate release/issue evidence. This QA report alone does not justify `Risolto` or closing #470.
