# Validation Report (Evidence Remediation) — #133 CI browser-e2e runtime reachability

- Slug: 133-ci-browser-e2e-runtime-mock-reachability
- Date: 2026-07-07T06:35:18.344Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
Fix statico verificato: workflow 127.0.0.1 (0 localhost residui), assert /v1/document-jobs, assert creazione, node --check OK.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/133-ci-browser-e2e-runtime-mock-reachability/final/after.png`
- Playwright HTML report: `artifacts/task-validation/133-ci-browser-e2e-runtime-mock-reachability/playwright-report/index.html`
- Trace: `artifacts/task-validation/133-ci-browser-e2e-runtime-mock-reachability/test-results/issue-133--133-CI-browser-e2e-runtime-reachability-chromium/trace.zip` 
- Video: `artifacts/task-validation/133-ci-browser-e2e-runtime-mock-reachability/test-results/issue-133--133-CI-browser-e2e-runtime-reachability-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/133-ci-browser-e2e-runtime-mock-reachability/test-results/issue-133--133-CI-browser-e2e-runtime-reachability-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-133.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
