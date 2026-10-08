# #403 Independent QA — first candidate

Candidate: ebbc4b024e7af106415337979969a046774053ee. Baseline: 4ddb4b4c.

## Phase results

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract/issue | PASS | task-contract.md; issue #403 body and empty comments read independently |
| 1 Scoped diff | FAIL | Unrelated formatting in PatientTherapyCalendar.tsx useEffect/cells/header and TerapiaFarmacologicaTab.tsx pre-existing blocks. Restore unrelated formatting without reverting intentional functionality. |
| 2 Types/build/regression | PASS with explicit baseline waiver | logs/types.log, tsc-build.log, vite-build.log; 1162 full tests, 1150 PASS, 12 identical known baseline failures; focused 101 tests, 100 PASS, 1 identical weekly/monthly baseline guard. Zero new regression failures. |
| 3 Actual SPA browser | FAIL | 10/12 assertions PASS. test-results/browser-results.json, playwright-report/index.html, trace.zip, desktop/doctor/mixed/empty/prn/mobile traces, video/final-desktop.webm and final-mobile.webm |
| 4 Security | PASS scoped inspection | No app dependency/config/backend/schema changes. Synthetic patient/drug/actor fixtures only. Zero clinical writes; viewing/navigation auth simulator session POST only. Role denied edit and doctor full second-page mapping verified. No unexpected console/runtime/relevant HTTP or external requests in final run. No new raw HTML/logging/secrets. |

## Acceptance criteria

- AC1: Desktop PASS. Mobile390x844 FAIL: warning headline only 34% within viewport initially when optional CF/phone remain missing. Screenshot screenshots/mobile-incomplete-first-screen.png. Counts visible but incomplete warning hidden below fold, contrary to contract.
- AC2: PASS. Explicit empty vs incomplete distinguishable, day/week correct, mixed one exact 10:30 dose and two incomplete vs weekly seven doses/two unique incomplete. PRN is not classified incomplete.
- AC3: FAIL. Nurse shows prescribing clinician, no edit. Doctor opens populated existing second-page prescription and focuses heading correctly, URL attivi, no write. However therapyFormRestore.schedulesFromTherapy maps fasciaNotte to22:00 (and other fascia/default times), inventing a time not present in source. Screenshot screenshots/doctor-second-page-existing-editor.png and doctor-trace.zip. Existing engine/read unchanged; repair new-link mapping only.
- AC4: PASS. Native details keyboard accessible; grid has unlimited height/no local vertical overflow; mobile week horizontal content reachable locally without page x overflow. Original 24-hour rows retained with no invented events.

First bootstrap lacked room-options/parameters mocks and failed due to guarded synthetic500; fixture repaired, no app change, final run has zero unexpected errors. This is a harness initialization issue, not an application finding.

## Required repairs

1. New incomplete-editor entry must restore saved exact times/schedules only, no inferred fascia/default time, while leaving existing callers/clinical engine unchanged.
2. Make mobile initial counts and incomplete headline visible before secondary navigation controls/description, including optional demographics banner case.
3. Remove unrelated formatting from candidate diff.

## Final Decision

FAILED VALIDATION. Root must repair and commit a new immutable candidate, then fresh independent QA. No release/issue closure authorized by this report. QA wrote evidence only; ownership returned to root after stopping local server.
