# Round 2 author validation — F507-1

Final Decision: IMPLEMENTED — NOT VERIFIED

## Identity and preserved history

Issue #507 only; branch codex/bug-batch-507; baseline/HEAD 715a4b9e47ff9bd0192b7f58f24271e48da4900d; uncommitted source patch. Reserved implementation round 2 nonce b3c7d563-d85e-4371-bf2e-c1d6a92cbe4d, canonical state ad6a3cee92ed9b412c41e311b4c582ca4dfc3e62. Coordinator owns canonical/GitHub writes. QA1 nonce 6592e6d1-eca2-4d1e-8bf0-81ad48b8765b returned FAILED VALIDATION for F507-1. Its report, result, source snapshot, screenshots, traces and videos remain unchanged at the coordinator's private path. Original author round1 report and outputs in the parent packet remain unchanged. These author round2 passes do not convert QA1 into a pass.

## Repair

New manual drafts without a valid admission now retain explicit per-field automatic fallback lineage. Native input marks start/once date operator-owned, including a same-value fallback-day selection or deliberate blank. A valid admission arriving later hydrates only still-automatic dates, then consumes the lineage. Dates are never classified by equality with today. Chart lineage is bound to the patient and is cleared for calendar-slot or existing-prescription editors and on cancel. Intake lineage applies only to row objects newly created in the current editor; existing/imported/external/persisted replacements have no lineage. No metadata is added to payloads. Existing IntakeWorkspace admission updates preserve current row identity. Previously loaded valid admission context retains one-time creation behavior.

Application changes in round2: therapyAdmissionDate.ts; TherapyFormFields.tsx; TerapiaFarmacologicaTab.tsx; TherapyIntakeEditor.tsx. Original round1 PatientDetail/TherapyEditor/StepClinica wiring remains. Regression suite expanded; test-only smoke now renders the actual PatientDetail lazy host chain and StepClinica, preloading the development lazy module to avoid cold dev-graph timeout artifacts. It is never linked from production.

## Acceptance and actual test results

| Check | Result | Evidence |
|---|---:|---|
| F507-1 original unchanged QA1 cold probe, rerun as author | PASS 2/2 timezone cases | original-qa1-probe/results.json; test-results/original-qa1-probe.log |
| Untouched cold PatientDetail dates | PASS Rome and Los Angeles | component-smoke/results.json; *-cold-untouched.png |
| Pre-arrival start-only/once-only edits | PASS both fields independently, both zones | component-smoke/results.json; *-cold-start.png and *-cold-once.png |
| Explicit same fallback day and empty start | PASS both zones | component-smoke/results.json; *-cold-same-fallback.png and *-cold-empty-start.png |
| Saved editor, patient-key remount, loaded context retention | PASS both zones | Actual PatientDetail browser assertions |
| New intake late admission, independent date edits and same fallback | PASS both zones | Real StepClinica browser assertions |
| Calendar/imported explicit-date and payload precedence | PASS unit coverage | Focused/full suites; calendar forms have no automatic lineage |
| Focused clinical/date/calendar tests | PASS 15/15, 0 skipped | test-results/focused-tests.log; includes 13 admission tests and 2 calendar tests |
| Complete frontend suite | PASS 1572/1572, 0 failed/skipped/cancelled | test-results/frontend-tests.log |
| Frontend TypeScript/Vite build | PASS | test-results/frontend-build.log; explicit localhost API origin; existing chunk/plugin advisories only |
| Expanded actual-host/browser smoke | PASS 26 scenario groups across 2 zones | component-smoke/results.json; zero browser/HTTP errors and unexpected requests |
| Secret scan | PASS 0 findings | test-results/security-scan.log |
| Diff whitespace | PASS | git diff --check |

Original unchanged cold probe now records initial fallback 2026-10-25, hydrated start 2026-09-15 and once date 2026-09-15 in both zones. This was executed against the final source; it is author reproduction, not independent QA2. The actual QA1 report remains a failed report on its frozen round1 source.

## Reproduction commands

Use installed Node 22 and existing dependencies, from this worktree. Standard focused/full test and frontend build commands remain unchanged. Safe executable browser command:

`QA_OUTPUT_DIR=/absolute/private/output node e2e/issue507-smoke.mjs`

This owns/closes frontend-only port 5178, disables env-file loading, fixes API origin to localhost3999, intercepts exact synthetic GET contracts, fulfills known font CSS locally and fails unexpected hosts/requests. The actual PatientDetail host receives synthetic controlled cartella props; full App authentication/network orchestration is not mounted. Original private QA1 cold probe was reused read-only with round2 output and the coordinator-owned ffmpeg cache.

## Limits and next gate

No real database or authenticated persistence/save E2E; existing payload mapping tests cover submitted dates. Browser calendar-slot creation and imported-document review were not executed as full UI flows; their explicit-date precedence is covered by units and scoped lineage reset. No source CSS changes or new computed contrast claim. No Git commit/push, GitHub/canonical mutation, merge, deploy, issue closure, production/provider call or real patient data. Fresh independent QA2 remains required. All owned frontend servers close in finally blocks.

Exact final sources/configuration are bound by source-manifest.json and source-changes.sha256 in this directory.
