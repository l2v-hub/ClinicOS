# Validation Report — Issue #202 "Privacy voice logging"

- Slug: 202-privacy-voice-logging
- Branch: `fix/issue-202-privacy-voice-logging` (base `origin/main` @ `b5c06c4`)
- Date: 2026-07-06
- Mode: B (CI-gate evidence; no local app run / no Playwright — not required for this issue)
- Governance: Claude implementa+evidenzia; **Codex QA gate** decide chiusura. Claude NON chiude/merge/deploy.

## Change

Aggiunto un test di regressione privacy DB-free:
`backend/src/ai/__tests__/voice-privacy-logging.test.ts` (+ registrato nella lista esplicita
`backend/package.json` `test`). Nessuna modifica al codice applicativo: il percorso vocale è già
PHI-safe per costruzione; mancava la **prova automatica** richiesta dall'issue (AC3).

Il test guida flussi vocali reali via l'orchestratore (dipendenze iniettate, nessun DB), cattura
`console.*` reale + gli eventi persistiti (spy `setAuditPersistence`) e verifica la sanitizzazione.

## Acceptance Criteria — verifica una per una

| AC | Come verificato | Esito |
|---|---|---|
| AC1 No full transcript is logged | 4 scenari (create confermato, nota diario free-text, rifiuto delete, plan delete): asserito che la trascrizione completa e i token PHI (`mariazzrossi`, `warfarinzz999`, valori vitali) NON compaiono in stdout/stderr né nell'evento persistito | PASS |
| AC2 Audit stores minimal metadata only | Parsing della riga `[ai-voice]`: chiavi ⊆ `{requestId,userId,patientId,actionType,recordId,fields,source,channel,outcome,at}`; `fields` sono soli NOMI (nessuno spazio, nessun valore vitale); rifiuti con `fields:[]` | PASS |
| AC3 Privacy test verifies sanitized logs | Il test stesso è la verifica; verde | PASS |

## Test eseguiti (evidenza)

- `voice-privacy-logging.test.ts`: **4/4 PASS** — output in `test-results/voice-privacy-logging.txt`.
- Suite backend completa (lista curata, `DATABASE_URL` fittizio, eseguita da worktree con node_modules root):
  **276 pass / 14 fail**. I 14 fallimenti sono **esclusivamente** test di integrazione che eseguono query
  su Postgres reale (`count`/occupancy, `confirmDraft`, `seedDraftFromImport`, `appointment-service`,
  `createTherapyInTx`): falliscono con `DATABASE_URL is required` / assenza DB — **non provisionato in mode B**.
  Verificato che gli **stessi** file falliscono identici sul baseline pulito `origin/main` (worktree `triage`):
  → **nessuna regressione introdotta**. Il nuovo test e tutti i test AI unit passano.

## Cosa resta al CI gate (mode B — Claude non può provisionare localmente)

- `npm run build` (`prisma generate` + `tsc`) su runner con toolchain installata.
- I 14 test di integrazione su Postgres provisionato (già verdi su main).
- Deploy (Vercel/Railway) — non pertinente: cambiamento solo-test, nessun runtime prod modificato.

## Privacy/Security review

- Nessun dato sanitario reale nei test (sentinelle sintetiche).
- Il test rafforza la garanzia: trascrizione e valori clinici mai nei log/audit. Coerente con
  `voice/audit.ts:1-3` (field NAMES only) e con la policy PHI-free del gateway.

## Final Decision

IMPLEMENTED — VERIFIED (privacy test 4/4 verde; AC1/AC2/AC3 soddisfatte; zero regressioni nei test DB-free).
Build completo + test di integrazione su DB + eventuale deploy restano al **Codex QA gate** (mode B).
Claude non chiude l'issue.
