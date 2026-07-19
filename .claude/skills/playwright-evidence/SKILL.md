---
name: playwright-evidence
description: Produce objective Playwright evidence (screenshots, trace, report) into the artifacts/task-validation/<slug>/ structure the ClinicOS Quality Gate + Codex QA require. Use whenever a UI/feature change needs verifiable proof before declaring it verified.
disable-model-invocation: false
allowed-tools: Read Write Edit Bash Grep Glob
---

# Playwright evidence (Quality Gate)

Genera evidenze **oggettive** nella struttura che il Quality Gate e il Codex QA pretendono.
Commenti testuali o "AC soddisfatto" senza prove NON sono accettati.

## Struttura di output (obbligatoria)

```
artifacts/task-validation/<slug>/
  task-contract.md          # già creato dal Quality Gate
  validation-report.md      # tabella AC PASS/FAIL + risultati test
  screenshots/              # screenshot finale del risultato verificato
  video/                    # solo se UI/chatbot/voice
  trace/trace.zip
  playwright-report/
  test-results/
```

## Precondizioni

- Stack locale su: frontend `http://localhost:5173`, backend `http://localhost:3001`
  (o le porte e2e da `backend/.env` — vedi memoria local-db-startup-gotcha).
- Contract valido già presente per lo slug.

## Asserzioni reali (non negoziabili)

Ogni test deve contenere:

- `await expect(locator).toBeVisible()` sull'elemento chiave;
- verifica del **valore** risultante (non solo presenza);
- **zero errori console** (`page.on('console', ...)` → fail su `error`);
- **nessun 4xx/5xx** rilevante (`page.on('response', ...)`);
- **persistenza dopo reload** quando si crea/aggiorna un dato.

## Cattura trace + report

Configura o lancia con:

```
npx playwright test --trace on --output=artifacts/task-validation/<slug>/test-results
```

(se `npx` viene riscritto in `npm` dal shell hook, chiama il binario diretto:
`frontend/node_modules/.bin/playwright test ...`). Copia `trace.zip`, `playwright-report/`
e lo screenshot finale nelle sottocartelle sopra.

## Feature interne senza UI

Non rifiutare mai lo screenshot: crea una **superficie QA test-only** (endpoint interno
non-prod, pagina QA protetta da env, o un report HTML/JSON generato dal test) che Playwright
apre, asserisce e fotografa. Nessun PHI/segreto nei log; solo fixture sintetiche.

## Chiusura

Scrivi `validation-report.md` con la tabella AC e `Final Decision`. Solo `CLOSED — VERIFIED`
consente di dichiarare verificato: `node scripts/quality-gate/check-closure.js <slug>`.
Per issue GitHub marcate da Codex, **allega** screenshot + link a trace/report al commit SHA.
