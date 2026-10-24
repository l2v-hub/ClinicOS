# Task Validation Report

## Task
- Issue: #507 only
- Branch: codex/bug-batch-507
- Baseline: 715a4b9e47ff9bd0192b7f58f24271e48da4900d
- Date: 2026-10-24
- Commit: uncommitted author patch; source-manifest.json binds tested files.
- Reservation: implementation round 1, ff31e026-6aa9-46c1-9ea2-c64f6d8a48cd.

## Implementation Summary

New chart forms use the existing resolved presa-in-carico admission day (saved dataIngresso or legacy dataPresa). PatientDetail passes that day through TherapyEditor. New manual intake rows use ingresso.dataPresa through StepClinica and the same editor. The factory initializes start and once administration dates once, validating the calendar day without timezone conversion. Missing/invalid admission retains the existing Europe/Rome current-day fallback. Saved/imported dates, operator edits, tab-retained drafts and explicit calendar slots retain precedence.

## Files Changed

Application: frontend/src/components/operator/PatientDetail.tsx; cartella/TerapiaFarmacologicaTab.tsx; cartella/TherapyFormFields.tsx; sections/TherapyEditor.tsx; sections/TherapyIntakeEditor.tsx; shared/intake/StepClinica.tsx; frontend/src/lib/therapyAdmissionDate.ts. Regression suite: cartella/__tests__/therapyAdmissionDefaults.test.ts. Test-only browser harness: e2e/issue507-smoke.mjs and e2e/issue507/entry.tsx. Exact paths/hashes are in source-manifest.json.

## Acceptance Criteria Result

| AC | Author result | Evidence |
|---|---:|---|
| AC1 chart defaults and reopen | PASS locally | Full frontend tests; actual chart component smoke in Rome/Los Angeles; production PatientDetail wiring typechecked |
| AC2 intake defaults and retained edits | PASS locally | Actual StepClinica -> TherapyEditor -> TherapyIntakeEditor browser flow in both zones |
| AC3 explicit sources and payload dates | PASS locally | Unit tests for calendar/saved/imported mapping and payloads; browser saved editor and manual edits |
| AC4 invalid/missing/leap/DST/timezone | PASS locally | Mocked UTC-boundary fallback test; leap/DST normalization tests; two browser device zones |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Complete frontend node suite, final source | PASS 1567/1567, 0 skipped | test-results/frontend-tests.log |
| Initial focused tests | PASS 12/12 | test-results/focused-tests.log; new final saved/legacy source test additionally covered by full suite |
| Frontend build (tsc -b and Vite) | PASS | test-results/frontend-build.log; explicit VITE_API_URL=http://127.0.0.1:3999 |
| Component browser smoke | PASS 4 scenarios, 2 timezones | component-smoke/results.json; PNGs and Playwright traces |
| Frontend secret scan | PASS | test-results/security-scan.log |
| git diff --check | PASS | Author command, no output |
| Screenshot/trace integrity | PASS | Six PNGs decode, both final trace ZIPs pass CRC and contain trace files; chart admission screenshot visually inspected |
| Independent QA | NOT RUN by author | Coordinator must open dedicated QA session |
| Authenticated API/database persistence E2E | NOT RUN | No backend/API/persistence changes; component HTTP is synthetic and intercepted |

## Runtime Evidence

Run from repository root with Node 22 and existing dependencies:

`QA_OUTPUT_DIR=/absolute/private/output node e2e/issue507-smoke.mjs`

The test creates and closes its own frontend-only Vite server on 127.0.0.1:5178, disables env-file loading, sets the API origin to 127.0.0.1:3999, intercepts explicitly enumerated synthetic GETs, fulfills known external font requests locally, and fails every unexpected host/request. It renders real TerapiaFarmacologicaTab plus StepClinica. No database, production, Railway or real patient data is used. Its dev React transform does not enable the production React compiler; the separate required production build passed. Screenshots/traces are component evidence, not full authenticated app E2E. No network save is performed; explicit submitted dates are verified through existing payload mappers in unit tests.

## Preserved Failures

- frontend-build-initial-fail.log: initial hypothesis incorrectly attached admission to API Paziente; TypeScript rejected it. Corrected to existing cartella resolver and explicit prop wiring, then build passed.
- component-smoke-initial-fail.log: initial smoke expected tab navigation to discard an existing draft; existing behavior retains edits. Changed scenario to assert retention then explicitly cancel/reopen.
- component-smoke-fixture-fail.log and component-smoke-fixture-fail/: UI assertions passed, but strict fixture guard caught missing GET /farmaci/stato. Added the real read contract as an explicit synthetic response; final smoke has no unexpected requests/errors.
- frontend-tests-initial-pass.log records intermediate 1566/1566 before the final saved/legacy source test; no pass is transferred to changed code.

## Residual Risks

Independent QA, actual full PatientDetail browser integration, authenticated backend reload/persistence, browser calendar-slot creation and computed contrast are not certified by this author. Existing unit tests cover calendar precedence and imported explicit date preservation. No original issue attachment has been inspected; only the newly generated synthetic browser evidence has been inspected. No Git commit, push, GitHub/canonical mutation, PR, merge or deploy was performed.

## Final Decision

IMPLEMENTED — NOT VERIFIED
