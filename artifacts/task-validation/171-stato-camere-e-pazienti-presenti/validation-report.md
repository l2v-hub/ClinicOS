# Validation Report (Evidence Remediation) — #171 Stato camere e pazienti presenti

- Slug: 171-stato-camere-e-pazienti-presenti
- Date: 2026-07-07T07:16:16.655Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
UI reale (admin → Posti Letto): 3 camere/4 letti, occupancy, letto OCCUPATO con paziente presente.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/171-stato-camere-e-pazienti-presenti/final/after.png`
- Playwright HTML report: `artifacts/task-validation/171-stato-camere-e-pazienti-presenti/playwright-report/index.html`
- Trace: `artifacts/task-validation/171-stato-camere-e-pazienti-presenti/test-results/issue-171--171-stato-camere-e-pazienti-presenti-chromium/trace.zip` 
- Video: `artifacts/task-validation/171-stato-camere-e-pazienti-presenti/test-results/issue-171--171-stato-camere-e-pazienti-presenti-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/171-stato-camere-e-pazienti-presenti/test-results/issue-171--171-stato-camere-e-pazienti-presenti-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-171.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
