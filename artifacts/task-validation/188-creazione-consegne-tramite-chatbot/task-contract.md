# Task Contract — #188 Creazione consegne tramite chatbot

- Issue: #188
- Slug: 188-creazione-consegne-tramite-chatbot
- Date: 2026-07-07T07:16:16.655Z
- Mode: Parallel Evidence Remediation (Codex QA gate). Claude produces objective evidence; Codex closes.

## Objective
Produce objective Playwright evidence that #188 meets its acceptance criteria on the current code
(real assertions, no console errors, no HTTP 4xx/5xx, persistence-after-reload where data changes;
QA report surface for internal/no-UI features), saved under this folder.

## Scope of evidence
Chatbot: plan create_consegna → conferma → execute → consegna persistita (trovata via GET /consegne).

## Acceptance
- A dedicated Playwright test with real assertions runs green on the current stack.
- Bundle present: final screenshot, trace.zip, playwright-report/, test-results/, video.webm.
- validation-report.md references the real artifact paths.

## Governance
Claude does NOT close the issue. Decision emitted: READY FOR CODEX QA. Codex re-runs the QA gate.
