# Independent QA #405 — appointment labels

Candidate21f8c75c221c464fb00499326cf261143b444bf4; baseline45f3582dae64b0f34d2c1181286ed1d919d85d97. QA reviewer bug405_qa did not author application code. Root explicitly froze application source and handed off evidence-only ownership. No commits/push/deploy/production patient access performed by QA.

## Acceptance criteria

| Criterion | Result | Objective evidence |
|---|---|---|
| AC1 all fields named coherently, unique ids | PASS automated | Actual SPA nurse create10controls/edit9editablecontrols and admin sharedform; native `labels`, `getByLabel`, `toHaveAccessibleName`; multiple simultaneous forms independent focused SSR test; browser-results.json |
| AC2 clicking each label focuses control | PASS automated | Native Playwright label clicks, no force-click, desktop1150x1004/mobile390x844 and admin; each corresponding control `toBeFocused`; trace/video |
| AC3 Tab order and errors with REAL screen reader | UNVERIFIED | Browser Tab/ShiftTab order, focus trap, conflict rolealert and description connections verified only. No genuine AT speech/output evidence. manual-screen-reader-protocol.md |
| AC4 preserve Escape and originating nurse slot focus | PASS automated | Free14:00slot Enter -> dialog -> Escape/cancel -> same slot `toBeFocused`; edit -> Escape -> Modifica focus; pending save Escape ignored and close/cancel disabled; browser-results.json |

## Five gate phases

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | issue-source.json original body/comments, task-contract.md; real-reader AC preserved, not waived |
| 1 Diff review | PASS | Only AppointmentForm.tsx and appointmentDialogAccessibility.test.ts application/test changes from baseline. ReactuseId54–57;9labels228–356; dialog error association159,385,397. Existing patientcombobox, savepayload, permissions and dialogcallbacks preserved |
| 2 Build and tests | PASS focused/types/build; baseline exception disclosed | logs/types.log, tsc-build.log, vite-build.log, focused-tests.log13/13PASS; full-regression.log1178total1166PASS12FAIL. All12 failures equal source-bound404baseline; zeroNEW. Fullsuite is NOT green. test-results/regression-comparison.json |
| 3 Runtime/browser | Automated PASS, required real AT BLOCKED | Actual SPA guarded synthetic routes, screenshots, trace.zip/mobile-trace.zip/admin-trace.zip, named videos, playwright-report/index.html, browser-results.json; AC3realreader absent |
| 4 Security | PASS scoped | security-scan.log0findings source/test/builtfrontend. No new API/auth/config/dependencies; no raw HTML injection, new logging, real patient fixtures or real network mutation. Boundary validation/auth remain existing code |
| 5 Verdict | BLOCKED | Real-reader proof unavailable; no production release/closure allowed |

## Runtime evidence and safety

Actual React SPA via local QA-only Vite7469, no replacement component page. Synthetic nurse/admin identities and single synthetic patient; all API requests intercepted. Patient search uses actual POST /patients/page/search lookup, not clinical mutation. Appointment flow attempted exactly2 mocked POST /appointments: intentional409conflict then held retry success; payloads byte-equivalent as objects and authenticated headers observed. Zero real backend writes. Retry preserves input; persisted mock fixture survives SPA reload and explicit synthetic role relogin. This is NOT proof of database durability or live server authorization.

One intentional409 produces an expected browser resource console error, recorded separately. Final run has zero unexpectedAPI, console, runtime, HTTP or external traffic failures in each context. Admin /admin/rooms bootstrap mocked empty. No screenshots/logs contain real patient identities or credentials. Synthetic simulator token is an unmistakable fake, not credential.

Named final screenshots:

- screenshots/desktop-create-labelled.png
- screenshots/desktop-conflict-alert.png
- screenshots/desktop-pending-save.png
- screenshots/desktop-reloaded-mock-appointment.png
- screenshots/desktop-edit-labelled.png
- screenshots/mobile-labelled.png
- screenshots/admin-labelled.png

Trace and media: trace.zip, mobile-trace.zip, admin-trace.zip; video/desktop.webm, mobile.webm, admin.webm. JSON/HTML: test-results/browser-results.json; playwright-report/index.html. Source/build/evidence receipt: independent-source-receipt.json, generated after final run with hashes. Rerun commands: node artifacts/task-validation/405-appointment-labels/qa-server.mjs; node .../qa-browser.mjs; node .../qa-commands.mjs; node .../qa-receipt.mjs.

## Limitations and diagnostic failures

Real screen reader AC3 remains external. Native computer-control APIs disabled; parent additionally checked no NVDA/JAWS/Narrator process/registeredinstall, standard NVDA paths absent. No speech/audible AT claim is made. Human steps in manual-screen-reader-protocol.md must run a source-bound synthetic test environment, not expose production patient data.

Existing admin calendar pointer-origin cells are nonfocusable divs (AdminAgenda.tsx481–486): no originating-cell focus restoration claim for admin. Unchanged in405; nurse slot focus is independently proven. No unrelated repair performed. Source files source-bound clean; unrelated dirty scripts/artifacts preserved.

First harness attempts failed due wrong route, missing synthetic search/rooms endpoint and omitted simulator relogin; admin extra origin assertion exposed existing limitation. See harness-diagnostics.md and failed-trace.zip/failedscreens/exception/raw page@videos, which are diagnostics and NOT acceptance proof. Final named proof/report is the passing automatic run. No error is suppressed other than intentionally injected409.

## Final Decision

BLOCKED — required AC3 REAL screen-reader evidence unavailable. Automated AC1/AC2/AC4 pass, but this is not a verified closure or authorization to publish production. Preserve candidate and evidence, leave GitHub issue open, request genuine source-bound AT evidence or user direction through the gatekeeper.

Codex must now re-run the QA Gate.
