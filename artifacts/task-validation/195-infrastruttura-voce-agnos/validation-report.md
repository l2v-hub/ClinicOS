# Validation Report (Evidence Remediation) — #195 Infrastruttura voce Agnos

- Slug: 195-infrastruttura-voce-agnos
- Date: 2026-07-07T07:16:16.655Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
GET /ai/voice/stt: contratto STT capability/degradation; trascrizione Web Speech client-side.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/195-infrastruttura-voce-agnos/final/after.png`
- Playwright HTML report: `artifacts/task-validation/195-infrastruttura-voce-agnos/playwright-report/index.html`
- Trace: `artifacts/task-validation/195-infrastruttura-voce-agnos/test-results/issue-195--195-infrastruttura-voce-agnos-chromium/trace.zip` 
- Video: `artifacts/task-validation/195-infrastruttura-voce-agnos/test-results/issue-195--195-infrastruttura-voce-agnos-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/195-infrastruttura-voce-agnos/test-results/issue-195--195-infrastruttura-voce-agnos-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-195.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
