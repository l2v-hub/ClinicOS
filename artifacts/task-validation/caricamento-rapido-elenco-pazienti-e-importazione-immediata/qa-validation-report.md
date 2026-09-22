# Independent QA validation — patient listing performance

Date: 2026-09-22. Reviewer: independent `patient_loading_qa` session.

Baseline: `393e8b4ae909d66d945d474c01bb7669b0d8be3d`.
Candidate source aggregate SHA-256: `8bbe6c94a38d43300d2e682e64e3e789c77831f8bbadac9541a825eb9685b106`.
Exact hashes of 399 frontend/build-input files, including the eight candidate files, are recorded in `qa-source-manifest.json`.

## Scope and ownership

Reviewed all eight candidate files listed in the source manifest's `changedFiles`: PatientList, PatientRoster, usePatientListPage, AIImportStatus, DialogLoading, patientPage, and the two focused test files. The launcher changes, prior product documents and historical artifacts are outside this review. No application or test files were edited by this QA session. The root agent temporarily handed filesystem writer ownership to QA; browser interaction remained serialized with root.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`, AC1–AC6, direct user request rather than a GitHub issue |
| 1 Diff and lifecycle review | PASS | Findings and lifecycle analysis below; `git diff --check` clean |
| 2 Build and tests | PASS | `qa-focused-tests.log`, `qa-types.log`, `qa-build.log`, candidate-production build |
| 3 Browser evidence | PENDING | Root reports 17 successful synthetic-browser assertions; screenshots and result records have not yet been persisted at QA handback |
| 4 Security | PASS | Checklist below; synthetic fixtures only |

## Code findings

No blocking correctness or security findings in the reviewed candidate.

- Initial load issues its request immediately. Only a changed search string starts a 250ms timer. Search still uses POST; names and fiscal codes are not put into query URLs.
- Patient identity rows become selectable as soon as their bounded page resolves. Admission/clinical summary enrichment is separately awaited and retryable; unknown data does not become a fabricated zero-signal result.
- `usePatientListPage` aborts the prior controller and increments a sequence when a request supersedes it. Both successful identity reads and summary reads check abort/sequence before publishing. Effect cleanup also invalidates responses on filter change or unmount. A stale transport response that ignores abort cannot overwrite a newer query.
- Appended pages deduplicate identities; if an in-flight enrichment is interrupted by pagination, all still-missing summaries are requested in bounded groups of 50. A failed summary does not discard identity rows. A same-query refresh retains identity rows while clearing clinical summary until refreshed.
- The import action is present in the initial markup, disabled and marked busy until service availability is known. No job is created by rendering the action. Existing operator headers and service gating are preserved.
- Both heavy dialogs are dynamic imports and conditionally mounted. The production manifest confirms neither is in the static PatientList dependency closure.

## Conditional-unmount audit

`DischargeImportModal`'s `open=false` effect resets local workflow state; a fresh mount reproduces those initial values. Explicit cancel sends the job cancellation request before `onClose`. Its poller cleanup stops the interval and invalidates callbacks. `useImportPreviews` cleanup revokes object URLs and increments session generation on unmount as well as closing. `CameraCapture` cleanup stops media tracks. No cancellation action depended solely on the removed `open=false` render.

`IntakeWorkspace` already clears its pending autosave debounce on unmount and restores body scrolling through effect cleanup. Its `open=false` effect resets local state and the pending debounce; a fresh mount starts the same clean workflow. Already-enqueued server autosaves are not cancelled by either old or new behavior. Opening remains the event that creates/loads a draft.

## Independently executed checks

1. `node --import tsx --import ./scripts/stub-css-loader.mjs --test frontend/src/lib/__tests__/patientPage.test.ts frontend/src/components/operator/__tests__/patientLoading.test.ts frontend/src/lib/__tests__/cachedFetch.test.ts frontend/src/lib/__tests__/patientRosterSort.test.ts`: **29 passed, 0 failed**.
2. From frontend: `node ../node_modules/typescript/bin/tsc -b --pretty false`: **exit 0**, zero errors. This checks the referenced projects, rather than only the empty root tsconfig.
3. From frontend: `node ../node_modules/vite/bin/vite.js build --manifest --outDir ../artifacts/task-validation/caricamento-rapido-elenco-pazienti-e-importazione-immediata/candidate-production`: **exit 0**, 412 modules transformed, production bundle emitted.
4. `git diff --check` over tracked candidate files: **exit 0**.

The existing test loader emits Node deprecation warnings. Vite reports its outside-root output directory and a large shared entry chunk. These are non-failing and are not claimed resolved by this patch. Installed tool versions are bound in the source manifest; no installation or lockfile edit occurred.

## Production bundle comparison

`qa-artifacts.mjs` independently traverses static `imports` from PatientList in both production manifests. It excludes the app entry and its already-loaded static closure, and does not follow `dynamicImports`. This measures incremental JavaScript payload on patient-route navigation, not transfer time or whole-app size.

| Metric | Baseline | Candidate |
| --- | ---: | ---: |
| Incremental static JavaScript | 660,201 bytes | 40,793 bytes |
| Sum of individual gzip sizes | 201,680 bytes | 16,600 bytes |

Uncompressed incremental payload reduction: **93.82%**. Exact chunk lists and manifest hashes are in `qa-bundle-comparison.json`. IntakeWorkspace and DischargeImportModal are dynamic entries in the candidate. The application shell and other routes remain outside this performance claim.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets | PASS — no keys, tokens, passwords, connection strings introduced |
| PHI | PASS — fixture identities are explicitly synthetic; no new persistent patient cache |
| Logging | PASS — no new patient payload logging in application changes |
| Input boundaries | PASS — existing bounded page limits and POST search preserved; summaries chunk to 50 unique IDs |
| Authorization | PASS — operator headers and existing import availability gate retained; no backend permission changes |
| Injection/XSS | PASS — no raw HTML/SQL or unsafe rendering introduced |
| Dependencies | PASS — no new packages or dependency manifest changes |
| Configuration | PASS — no env, CORS, production flags or backend changes |
| Freshness | PASS — patient rows exist only in component lifetime, new queries clear rows, late responses guarded by sequence |

## Browser evidence handoff

Root reports successful controlled checks for early identities, loading text, clinical-summary failure/retry, 52 unique paginated identities, ignored late search response, lazy import/new-patient opening, unavailable service, page-error retry, mobile layout and empty state. Reported cold measurements use synthetic delays of 700ms for identities, 1,000ms for summary and 1,600ms for service status: row appearance 2,082ms baseline versus 767ms candidate; import action 1,705ms versus 42ms. These are not production timings and are not independently attested here until source-bound records are available.

The browser evidence contract explicitly notes that this environment's supported CUA tooling does not export Playwright traces/videos. Do not fabricate those artifacts or describe the reported assertions as an independent browser rerun. Persist supported screenshots/assertions and document the capability limitation before closing Phase 3.

## Verdict at handback

**BLOCKED — browser evidence record pending, no code/build/security defect found.**

Code, tests, production build, lifecycle and security review are ready for the root gatekeeper. This is an evidence handoff condition, not a request for user approval. Re-review the persisted browser artifacts to close Phase 3. Any subsequent app/style modification needs a refreshed candidate hash/build comparison; this verdict binds only the source hash above. No commit, push, deployment or external message was performed by this QA session.

## Final evidence review — 2026-09-22

The independent patient_loading_qa session subsequently read browser-evidence.json and visually inspected screenshots/summary-error.png, mobile-pending.png, baseline-first-render.png and candidate-first-render.png. Phase 3: PASS against the supported contract. All 17 recorded assertions passed, error arrays were empty, and all eight candidate files still matched the source manifest (zero mismatches). The reviewer performed no file writes in this second phase.

Final independent verdict: READY FOR CODEX QA. The evidence-pending handback condition above is resolved. This is independent review of root's serialized browser execution, not a separate browser rerun. Controlled timings and unavailable trace/video are explicitly disclosed.
