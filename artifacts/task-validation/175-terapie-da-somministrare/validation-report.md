# Validation Report (Evidence Remediation) — #175 Terapie da somministrare

- Slug: 175-terapie-da-somministrare
- Date: 2026-07-07T07:16:16.655Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
GET /patients/:id/therapies 200: terapie del paziente disponibili.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/175-terapie-da-somministrare/final/after.png`
- Playwright HTML report: `artifacts/task-validation/175-terapie-da-somministrare/playwright-report/index.html`
- Trace: `artifacts/task-validation/175-terapie-da-somministrare/test-results/issue-175--175-terapie-da-somministrare-chromium/trace.zip` 
- Video: `artifacts/task-validation/175-terapie-da-somministrare/test-results/issue-175--175-terapie-da-somministrare-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/175-terapie-da-somministrare/test-results/issue-175--175-terapie-da-somministrare-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-175.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
