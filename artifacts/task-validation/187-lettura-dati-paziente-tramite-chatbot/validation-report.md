# Validation Report (Evidence Remediation) — #187 Lettura dati paziente tramite chatbot

- Slug: 187-lettura-dati-paziente-tramite-chatbot
- Date: 2026-07-06T15:57:37.209Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
UI reale: chatbot Agnos risponde "mostrami gli ultimi parametri di Moretti Elena" con parametri (SpO2/FC/PA) e Fonte: VITAL_SIGN.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/187-lettura-dati-paziente-tramite-chatbot/final/after.png`
- Playwright HTML report: `artifacts/task-validation/187-lettura-dati-paziente-tramite-chatbot/playwright-report/index.html`
- Trace: `artifacts/task-validation/187-lettura-dati-paziente-tramite-chatbot/test-results/issue-187--187-lettura-dati-paziente-tramite-chatbot-chromium/trace.zip` 
- Video: `artifacts/task-validation/187-lettura-dati-paziente-tramite-chatbot/test-results/issue-187--187-lettura-dati-paziente-tramite-chatbot-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/187-lettura-dati-paziente-tramite-chatbot/test-results/issue-187--187-lettura-dati-paziente-tramite-chatbot-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-187.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
