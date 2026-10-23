# Certain canonical acceptance-harness finding — medium

`e2e/qa-bug-batch-447-browser.mjs:1302` waits for `.patient-roster tbody tr` before immediately reading allbody text at1304 and asserting `/QA44-/` at1309. `PatientRoster.tsx:458` deliberately renders a realvisible `tr` containing `Caricamento…` while the patient request is pending. Consequently the wait can succeed before any resident row exists. This is a correctness defect in the canonical harness; the current end-to-end gate did not pass and must not be reported as verified merely because the product later loads.

The new independent run is RED:452 sees `Caricamento…`, no unexpected console/page/HTTP errors. The actual trace records:

- wait `.patient-roster tbody tr >> nth=0`, default unchanged30000ms, begins81369.805 and succeeds81477.759;
- header read returns `Letto` at81521.379;
- bodyread returns `Caricamento…` at81538.431;
- failure screenshot starts81844.543 and completes82332.323, already showing actual50loaded rows, assigned `QA44-<run>` room and bed7.

The screenshot was decoded and visually inspected. This establishes an inadequate readiness selector, rather than a persistent failure to render roster data. No diagnostic hook or repeated7-scenario run was used. See `finding-452-trace-receipt.json`, original `browser/evidence/issue-452-trace.zip`, `browser/evidence/issue-452.png` and `browser/evidence/results.json`.

The same original run also fails457 at2439: it expects one enabled `QA Agenda pending452` dose belonging to a different patient, but that resident/therapy is created only after the failed assertion in452. Its absence is a downstream synthetic-fixture dependency from the same earlier abort. All PSchecks reached before that point (printing, explicit pause, scheduled/PRN server guard, prior receipts, tamper/OSS denials, reload and paused modal) passed, but return/remaining457 assertions were not reached and the overall457 scenario is FAILED. Do not discard this failure, suppress the other-patient assertion, insert a fake success, or claim complete457 acceptance.

Minimum correction for root-reserved next implementation round: make this single existing wait select a real `.patient-roster__row` before the unchanged result assertions. Preserve the existing30000ms timeout and every value, unknown-state, ACL, paging, fixture and other-patient oracle. No application change is indicated by this finding; no source was fixed by QA. A fresh independent gate must run the corrected7-scenario suite after authorSTOP; unchanged94source bytes except that one harness path allow source-exact reuse of this QA's actual frontend/backend and independent module/lifecycle proofs, subject to root review. Parent actual-reviewed-main requirements still apply independently.
