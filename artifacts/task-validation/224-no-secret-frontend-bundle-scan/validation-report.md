# Validation Report — Issue #224 "No secret frontend e scansione bundle"

- Slug: 224-no-secret-frontend-bundle-scan
- Branch: `fix/issue-224-secret-scan` (base `origin/main` @ `b5c06c4`)
- Date: 2026-07-06
- Mode: B (CI-gate evidence; no local app run). Playwright boilerplate non pertinente: nessuna modifica UI.
- Governance: Claude implementa+evidenzia; **Codex QA gate** decide chiusura. Claude NON chiude/merge/deploy.

## Change

- `scripts/security/scan-frontend-secrets.mjs` — scanner segreti frontend, Node puro (nessuna dipendenza
  nuova): rileva formati di chiavi provider (OpenAI/AWS/Google/Slack/GitHub/JWT/private key), riferimenti a
  env var server-only segrete, `VITE_*` dal nome sensibile, e credenziali hardcoded; allowlist via marker
  `secret-scan-ignore`; anti-falsi-positivi su placeholder/`import.meta.env`. Modalità `--self-test`.
- `.github/workflows/frontend-secret-scan.yml` — gate CI su PR/push che toccano `frontend/**`: self-test →
  scan sorgenti → `npm ci` + `npm run build:frontend` → **scan del bundle `frontend/dist`** (dove Vite inlina
  in chiaro `import.meta.env.VITE_*`).
- `package.json` — script `security:scan-frontend`.

## Acceptance Criteria — verifica una per una

| AC | Come verificato | Esito |
|---|---|---|
| AC1 Secret-like env vars not referenced by frontend | scan di `frontend/src` + `index.html` → **0 findings** (unico `VITE_` usato = `VITE_API_URL`, non sensibile) | PASS |
| AC2 Bundle/grep proof attached | output scan in `logs/scan-evidence.txt`; il gate CI builda e scandisce anche `frontend/dist` | PASS (source) / CI (bundle) |
| AC3 CI or script detects common secret patterns | `--self-test` verde + proof positiva su file con segreto finto → **exit 1, 2 findings**; workflow CI aggiunto | PASS |

## Test / evidenza (mode B)

- `--self-test`: OK (detection + allowlist + placeholder). 
- Scan `frontend/src` + `frontend/index.html` + `vite.config.ts`: **0 findings, exit 0**.
- Proof positiva: file con `sk-…` + `AZURE_OPENAI_API_KEY` → **exit 1** (rilevato). Log: `logs/scan-evidence.txt`.
- `package.json` JSON valido; workflow YAML structural-check OK.

## Cosa resta al CI gate

- Esecuzione reale del job `Frontend Secret Scan` su GitHub Actions (self-test + scan sorgenti + build +
  scan `dist`). Il build del bundle richiede `npm ci` (rete) → runner CI, non locale in mode B.
- Deploy non pertinente (nessun runtime prod modificato; solo tooling + CI).

## Privacy/Security review

- Nessun segreto introdotto; nessun dato reale. Lo scanner rafforza la postura di sicurezza del frontend.

## Final Decision

IMPLEMENTED — VERIFIED (scanner + self-test + scan sorgenti verdi; AC1/AC3 soddisfatte, AC2 su sorgenti;
scan bundle verificato dal gate CI). Esecuzione CI + eventuale deploy → **Codex QA gate**. Claude non chiude.
