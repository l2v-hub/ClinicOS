# Validation Report (Evidence Remediation) — #201 Test provider voce fake

- Slug: 201-fake-voice-provider-deterministic-tests
- Date: 2026-07-07T07:16:16.655Z
- Ambiente: stack ClinicOS locale reale (Postgres Podman + backend :3001 + frontend :5173), dati sintetici seed.
- Harness: @playwright/test (`qa-evidence/`), trace+video+screenshot+HTML report attivi.
- Governance: Claude produce evidenza; **Codex** verifica e chiude. Claude NON chiude l'issue.

## Cosa è stato verificato
Test voice-provider verde: FakeVoiceSttProvider copre success/failure/timeout senza credenziali.

## Evidenze oggettive (path reali)
- Screenshot finale: `artifacts/task-validation/201-fake-voice-provider-deterministic-tests/final/after.png`
- Playwright HTML report: `artifacts/task-validation/201-fake-voice-provider-deterministic-tests/playwright-report/index.html`
- Trace: `artifacts/task-validation/201-fake-voice-provider-deterministic-tests/test-results/issue-201--201-test-provider-voce-fake-chromium/trace.zip` 
- Video: `artifacts/task-validation/201-fake-voice-provider-deterministic-tests/test-results/issue-201--201-test-provider-voce-fake-chromium/` (*.webm)
- Test-results: `artifacts/task-validation/201-fake-voice-provider-deterministic-tests/test-results/issue-201--201-test-provider-voce-fake-chromium/`
- Spec Playwright: `qa-evidence/tests/issue-201.spec.ts`

## Test Playwright
1 test, esito PASS (vedi HTML report). Screenshot + trace + video allegati.

## Decisione
READY FOR CODEX QA — evidenze oggettive presenti (screenshot, trace, playwright-report, test-results, video).
