# Validation Report — #236 Agnos su Azure OpenAI (gpt-5.5)

- Date: 2026-07-07T08:48:36Z · Branch: `req-236-azure-gpt55` (da origin/main).
- Governance: Claude implementa+evidenzia; chiusura autorizzata dal proprietario.

## Esito
La configurazione Agnos/Azure OpenAI è **già env-driven**; #236 = documentazione Railway per il nuovo
deployment `gpt-5.5` + endpoint `.../openai/v1`, con verifica oggettiva di no-hardcoding, no-secret-frontend,
degradazione sicura. Nessuna chiave reale necessaria (impostata dal PO su Railway).

## AC / evidenza (Playwright QA report, verde)
- Config letta da env: AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT / AZURE_OPENAI_API_KEY — PASS
- Nessuna API key hardcoded nel codice — PASS (0 match)
- Nessun endpoint hardcoded nel codice — PASS (0 match)
- Nessuna key/endpoint nel frontend — PASS (0 match)
- Degradazione sicura (health available:false + errors senza crash/segreti) — PASS
- Documentazione Railway: `docs/agnos-azure-openai-gpt55.md` — PASS

## Evidenze
- Screenshot: `artifacts/task-validation/236-agnos-azure-gpt55/final/after.png` · trace/video/test-results: `artifacts/task-validation/236-agnos-azure-gpt55/test-results/` · report: `artifacts/task-validation/236-agnos-azure-gpt55/playwright-report/index.html`
- Docs: `docs/agnos-azure-openai-gpt55.md` · spec: `qa-evidence/tests/issue-236.spec.ts`

## Decisione
READY FOR CODEX QA / owner-authorized close. Codice env-driven; il PO imposta la key su Railway.
