# Independent QA — CI notes isolation

Verdict: **READY FOR CODEX QA**. All five mandatory phases PASS. This is not a release or native CI approval.

Baseline: 8124b1bc88c0f086b1ee328214f87f4802005d11. Candidate source SHA-256: e885289d27cc6c315f8fb252e367f7062243ce2117625383106eae486805713f. Dedicated QA session ci_note_isolation_qa1 did not author or alter the candidate. The only product/source change remains the authorized two-line addition in scripts/run-node-tests.mjs.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | Frozen task-contract.md and implementation-plan.md; independent review of actual native run 39028043893 unread 58 versus original 57; contract-validation.log |
| 1 Diff | PASS | diff-and-security-review.md; preservation-review.json; original source reconstructed by removing exactly the authorized two lines; original nine isolated suites and all 19 release-guard source Git objects unchanged |
| 2 Build and tests | PASS | source-syntax.log; diff-check.log; independent-probe-results.json and 11 per-probe logs: 27 actual child tests; expected original RED/new GREEN retained |
| 3 Browser | PASS | browser-results.json: fresh real production-runner execution with 2 child tests, 12 exact DOM value assertions, persistence across reload, zero console/page/HTTP errors; browser/result-after-reload.png, trace.zip and real-runner.webm, all under the shared lifecycle lock |
| 4 Security | PASS | diff-and-security-review.md and privacy-scan.json; all packet files plus ZIP members scanned, no credentials/PHI/raw issues; minimal child environment and synthetic fixtures only |

Independent process validation executes the actual production runner against new QA-only fixtures. Two identical writer/reader test bodies fail with the original runner and pass with the candidate. A 13-test execution covers three overlapping concurrent writers, then all nine existing global suites plus notes; every global reader verifies all producers finished and no second global reader is active. Ordinary frontend files retain actual concurrent execution, CSS imports, default tsconfig selection and no backend environment defaults. Explicit environment settings remain intact. A failing concurrent phase still permits the serial phase to execute while returning failure; an intentional serial child exit 7 produces the Node test runner's expected failing aggregate exit 1. Existing nonbackend isolated-suite behavior is preserved. Empty/missing source discovery are explicitly checked and are not counted as passing test coverage.

No frontend/backend application trees were installed or built for this sparse one-script target. JavaScript syntax and real runner subprocess execution are the applicable local build/runtime checks. The complete unchanged native backend and browser suites must still pass on the operational PR. This QA does not claim that failed native CI39028043893 has been rerun successfully, that Railway configuration is fixed, that Claude has reviewed, or that any source issue can close.

The initial QA frontend overlap oracle assumed a 150 ms process startup window. Its original logs are preserved in history/initial-frontend-overlap-oracle/. Replacing that QA-only timing assumption with a bounded two-child barrier produced objective overlap; no application source or privacy assertion changed. All 12 author files, the original candidate seal and both frozen contracts remain byte-for-byte unchanged. Temporary fixtures are removed by finally on every probe.

Publication, required CI, exact-SHA review and release remain the root gatekeeper's responsibility. This session did not commit, push, merge, close issues, mutate GitHub/controller state, invoke paid models or access patient databases.

The browser screenshot was visually inspected: its source hash, two executed tests, completed writer, serial reader, zero exit and single persisted execution are visible without overlap. The QA-only server and browser closed successfully. The valid VP8 video, PNG signature and trace ZIP CRC are independently checked in media-validation.json and privacy-scan.json. Exact evidence hashes and original seal preservation are recorded by qa-artifact-manifest.json and qa-seal.json.
