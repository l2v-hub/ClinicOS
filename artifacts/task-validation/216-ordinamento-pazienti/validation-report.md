# Validation Report (Evidence Remediation) — #216 Ordinamento pazienti

- Slug: 216-ordinamento-pazienti
- Date: 2026-07-07T07:16:16.655Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
UI Pazienti: lista ordinata (lib/patientSort) renderizzata; no console error, no HTTP 4xx.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/216-ordinamento-pazienti/final/after.png`
- Playwright HTML report: `artifacts/task-validation/216-ordinamento-pazienti/playwright-report/index.html`
- Trace: `artifacts/task-validation/216-ordinamento-pazienti/test-results/issue-216--216-ordinamento-pazienti-chromium/trace.zip` 
- Video: `artifacts/task-validation/216-ordinamento-pazienti/test-results/issue-216--216-ordinamento-pazienti-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/216-ordinamento-pazienti/test-results/issue-216--216-ordinamento-pazienti-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-216.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
