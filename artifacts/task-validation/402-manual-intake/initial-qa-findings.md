# Independent QA — initial candidate 3ecdce92

Verdict: FAILED VALIDATION. Application ownership returns to root for repair; these findings are not a closure certificate.

The actual full SPA (index.html → App.tsx → keyed WidgetGroup) was run on localhost:5185. Backend calls were intercepted before login, with synthetic nurse/OSS identities, a single synthetic patient and an in-memory versioned draft. No production patient APIs or real data were used.

## Findings

1. Back → roster focus is intermittent. The first browser run returned to #/pazienti, but the Nuovo ingresso button remained inactive through the five-second assertion timeout. Subsequent runs passed the same assertion, confirming a timing-sensitive defect rather than deterministic restoration. Root should replace the one-frame query with destination-mount-owned focus.
2. Full regression has one new source-guard failure: `src/lib/__tests__/importLandsOnPatient.test.ts`, test «Nuovo ingresso opens the start page, then the shared NewPatientFlow…». Its regexp assumes `<NewPatientStart>` immediately follows return, whereas the fixed route uses a fragment containing chooser and flow. Update this expectation to the intended persistent route, not the old remounting behavior.

## Independent command results

- Typecheck: PASS (`logs/types.log`).
- tsc build: PASS (`logs/tsc-build.log`).
- Vite production build: PASS (`logs/vite-build.log`).
- Focused intake/navigation suite: 112 PASS, 0 FAIL (`logs/focused-tests.log`).
- Full frontend suite: 1156 total, 1143 PASS, 13 FAIL (`logs/full-regression.log`). Twelve were recorded baseline failures; the thirteenth is the source guard above. Not waived.
- Latest synthetic full-SPA browser run: all 11 concrete checks PASS (`test-results/browser-results.json`), but initial intermittent Back focus failure remains a required repair.

The initial harness also had fixture-only omissions (parameter-reading prefetch and Google-font interception), retained in `test-results/initial-failed-browser-results.json`. Those were corrected in the QA harness, not application code. Subsequent route recovery, denied-role empty/populated lists, keyboard trap, cancellation, saved Name after reload/relogin and mobile form are verified against the initial candidate. Expected injected opening 503 and lazy-module failure are reported separately from unexpected errors.

Evidence: `screenshots/manual-form-name-focused.png`, `screenshots/draft-opening-error.png`, `screenshots/lazy-module-error.png`, `screenshots/mobile-manual-form.png`, `trace.zip`, `draft-failure-trace.zip`, `lazy-failure-trace.zip`, `playwright-report/index.html`, `test-results/browser-results.json`, `video/`.

Security review so far: no backend/schema/API/config/dependency change; existing capability checks retained and empty-roster action gated; synthetic-only fixtures; harness guards unhandled/external APIs and never permits patient create/confirm. Root remains release/closure gatekeeper.
