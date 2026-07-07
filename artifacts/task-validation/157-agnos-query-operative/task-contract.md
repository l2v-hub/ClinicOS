# Task Contract — #157 Agnos query operative su struttura e pazienti

- Issue: #157
- Slug: 157-agnos-query-operative
- Date: 2026-07-07T07:00:15.234Z
- Mode: Parallel Evidence Remediation (Codex QA gate). Claude produces objective evidence; Codex closes.

## Objective
Produce objective Playwright evidence that #157 meets its acceptance criteria on the current code
(real assertions, no console errors, no HTTP 4xx/5xx, persistence-after-reload where data changes;
QA report surface for internal/no-UI features), saved under this folder.

## Scope of evidence
Motore componibile: authz(context-facility)+validate+schema verdi; dato facility live (/admin/rooms). NL→plan in UI usa planner LLM.

## Acceptance
- A dedicated Playwright test with real assertions runs green on the current stack.
- Bundle present: final screenshot, trace.zip, playwright-report/, test-results/, video.webm.
- validation-report.md references the real artifact paths.

## Governance
Claude does NOT close the issue. Decision emitted: READY FOR CODEX QA. Codex re-runs the QA gate.
