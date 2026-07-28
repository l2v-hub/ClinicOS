---
name: clinicos-qa-evidence-harness-gotchas
description: qa-evidence Playwright harness — @playwright/test va installato no-save alla root; EV_OUT deve essere ASSOLUTO; helpers.ts guard filtra rumore benigno
metadata:
  node_type: memory
  type: project
  originSessionId: b98b2897-b1a6-4612-b6df-3a13ca195b75
  modified: 2026-07-19T22:16:43.827Z
---

Harness evidence `qa-evidence/` (config + helpers + tests) per il Quality Gate ClinicOS:

- La root ha solo `playwright` in devDependencies: prima di lanciare i test evidence serve
  `NODE_OPTIONS=--max-old-space-size=4096 npm install --no-save --ignore-scripts @playwright/test@<stessa versione>`.
- `EV_OUT` relativo viene risolto rispetto alla dir del config → l'output finisce in
  `qa-evidence/artifacts/...`. Passare sempre un percorso ASSOLUTO
  (`EV_OUT="E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/<slug>"`).
- Lancio: `node_modules/.bin/playwright test --config qa-evidence/playwright.config.ts <spec>`;
  poi copiare `trace.zip`/`video.webm` da `test-results/<dir>/` in `trace/` e `video/`.
- `helpers.ts` ha `guard()` (console+HTTP fail), `enterAs()` (role gate), `nav()`. Il suo ROOT
  hardcoded punta a C: (obsoleto, repo su E:) ma serve solo a runCmd/runBackendTest.
- Gotcha reale scovato così: [[clinicos-crud-color-convention]] — `OPERATOR_COLOR_PALETTE` aveva
  `#C77700` duplicato → React duplicate-key all'apertura del form operatori (fixato 2026-07-20).
- Backend orfano su Windows: TaskStop del task npm NON uccide il child tsx sulla :3001 —
  `netstat -ano | grep :3001` + `taskkill //F //PID <pid>` prima di riavviare con env diverse.

**Why:** senza questi 4 punti ogni sessione evidence perde 15-30 min sugli stessi errori.
**How to apply:** seguire l'ordine install → EV_OUT assoluto → run → copia trace/video.
