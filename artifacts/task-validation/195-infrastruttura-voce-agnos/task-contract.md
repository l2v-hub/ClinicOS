# Task Contract — #195 Infrastruttura voce Agnos

- Issue: #195
- Slug: 195-infrastruttura-voce-agnos
- Date: 2026-07-07T07:16:16.655Z
- Mode: Parallel Evidence Remediation (Codex QA gate). Claude produces objective evidence; Codex closes.

## Objective
Produce objective Playwright evidence that #195 meets its acceptance criteria on the current code
(real assertions, no console errors, no HTTP 4xx/5xx, persistence-after-reload where data changes;
QA report surface for internal/no-UI features), saved under this folder.

## Scope of evidence
GET /ai/voice/stt: contratto STT capability/degradation; trascrizione Web Speech client-side.

## Acceptance
- A dedicated Playwright test with real assertions runs green on the current stack.
- Bundle present: final screenshot, trace.zip, playwright-report/, test-results/, video.webm.
- validation-report.md references the real artifact paths.

## Governance
Claude does NOT close the issue. Decision emitted: READY FOR CODEX QA. Codex re-runs the QA gate.
