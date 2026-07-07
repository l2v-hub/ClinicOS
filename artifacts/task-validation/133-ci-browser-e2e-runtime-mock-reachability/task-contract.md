# Task Contract — #133 CI browser-e2e runtime reachability

- Issue: #133
- Slug: 133-ci-browser-e2e-runtime-mock-reachability
- Date: 2026-07-07T06:35:18.344Z
- Mode: Parallel Evidence Remediation (Codex QA gate). Claude produces objective evidence; Codex closes.

## Objective
Produce objective Playwright evidence that #133 meets its acceptance criteria on the current code
(real assertions, no console errors, no HTTP 4xx/5xx, persistence-after-reload where data changes;
QA report surface for internal/no-UI features), saved under this folder.

## Scope of evidence
Fix statico verificato: workflow 127.0.0.1 (0 localhost residui), assert /v1/document-jobs, assert creazione, node --check OK.

## Acceptance
- A dedicated Playwright test with real assertions runs green on the current stack.
- Bundle present: final screenshot, trace.zip, playwright-report/, test-results/, video.webm.
- validation-report.md references the real artifact paths.

## Governance
Claude does NOT close the issue. Decision emitted: READY FOR CODEX QA. Codex re-runs the QA gate.
