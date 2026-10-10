# Issue432 — partial candidate, not a release

Application candidate89888589ef1fcce8f200899aa07413c8bcb70325; source base30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6.26 scoped application/test files. Main/production unchanged. Mandatory independent QA is **FAILED VALIDATION**: final-source scoped67backend/26frontend/10adversarial/1mockservice/6browser and types/build pass, but fullfrontend1314/1302PASS/12baselineFAIL is not globally green; no real DB/deployment proof.134 fresh artifacts are sealed/copied under independent-qa/reconciliation. Screenshots prove their exact candidate behavior, not full clinical completeness or deployment.

Reproduce from the application candidate with the existing repository dependencies:

1. `node artifacts/task-validation/therapy-completeness/commands.mjs` (records focused/types/build/full tests and import checks).
2. `node artifacts/task-validation/therapy-completeness/serve.mjs` in one terminal (QA-only real-component build on assigned7542; does not enter frontend/dist).
3. `node node_modules/playwright/cli.js test --config artifacts/task-validation/therapy-completeness/native.config.mjs` in another terminal, serialized with any other browser run.
4. Read `import-audit.json`, `commands/regression-comparison.json`, `independent-qa/validation-report.md`, source receipts and immutable manifests. Source hashes/commit, public font requests, synthetic API interceptions and deny-all write capabilities are explicit.

Baseline evidence is an independently built real-component surface against unchanged30f source in an isolated checkout. Build helpers use known local Windows paths for that retained base; update those paths for a different host without pointing at the candidate by accident. A QA style addendum supplies all global CSS imports in actual application order. No real database, patient/session or production authentication test is claimed.

Every public screenshot, trace, native HTML report (including embedded ZIP contents), log and fixture is scanned before publication for configured credentials and known source identities. Test-only entry/helper paths remain under artifacts. Historical14a and8490 manifests are preserved, never relabelled as freshf705 validation. Never use these mocks to assert real provider/authentication/persistence behavior.

`IMPORT=1` selects the synthetic discharge review surface/tests (`/qa-therapy?intake`). Its draft reload stores synthetic rows only in QA browser sessionStorage; no API/database persistence is claimed. `import-regimen-check.mjs red|green` retains failing-before and passing-after parser/form cases.

Structured reconciliation: generate synthetic backend-bound rows with `node --import tsx artifacts/task-validation/therapy-completeness/reconciliation-fixture.mjs`; use `DIST=reconciliation-dist` for the QA server and `RECONCILE=1 RUN=<new-immutable-run>` for the native Playwright config (`/qa-therapy?reconcile`). PowerShell uses process environment assignments, not POSIX prefixes. A unique run of `reconciliation-check.mjs <run-name>` records67backend/26frontend/types/build and exact source diff. `final-regression.mjs` binds the final full suite to a clean application commit. All browser runs must serialize with independent QA7543. No endpoint/provider/DB call is needed or permitted by these synthetic surfaces.
