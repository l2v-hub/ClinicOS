# Requirement Processing Report — batch /process-requirment 2026-07-04

Repo: `l2v-hub/ClinicOS`. Fonte: GitHub Issues. Modalità: worktree isolati per issue
(`.worktrees/issue-<n>`), Spec-Kit/agent-team, Playwright con evidenze, verifica runtime
e deployment prima della chiusura.

## Coda iniziale (bug aperti a inizio batch)

4 bug (nessun titolo con prefisso letterale `REQ-`/`BUG-`; i bug usano il prefisso `Bug`):
#127 (critico, frontend+backend), #128 (P1, frontend), #130 (P1, backend), #129 (P2, frontend+backend).

## Esito

| Issue | Tipo | Titolo                                                    | Iter. | Esito                                               | PR   | Commit merge | Deployment             | Screenshot            |
| ----- | ---- | --------------------------------------------------------- | ----: | --------------------------------------------------- | ---- | ------------ | ---------------------- | --------------------- |
| #127  | BUG  | Creazione paziente non funzionante (manuale + import)     |   1/4 | ✅ PASS · CHIUSA                                    | #132 | `bdd797f`    | Vercel+Railway success | `docs/qa/issues/127/` |
| #128  | BUG  | Camera assegnata non risulta occupata                     |   1/4 | ✅ PASS · CHIUSA                                    | #134 | `1132dcd`    | Vercel+Railway success | `docs/qa/issues/128/` |
| #129  | BUG  | Ordinamento alfabetico pazienti non coerente              |   1/4 | ✅ PASS · CHIUSA                                    | #135 | `b443ce3`    | Vercel+Railway success | `docs/qa/issues/129/` |
| #130  | BUG  | Comandi vocali consegne/diario/parametri/appuntamenti     |   1/4 | ✅ PASS · CHIUSA                                    | #136 | `43b2cc1`    | Vercel+Railway success | `docs/qa/issues/130/` |
| #133  | CI   | browser-e2e (req020) fallisce per drift ambientale runner |     — | 🔵 APERTA (tracking infra, aperta durante il batch) | —    | —            | —                      | artifact CI           |
| #137  | BUG  | Agnos non legge config LLM da env Railway                 |   0/4 | ⛔ BLOCCATA (needs-info)                            | —    | —            | —                      | prod status probe     |

**Chiuse: 4 · Aperte: 2 (#133 tracking-infra, #137 needs-info).**

## Dettaglio per issue

### #127 — Creazione paziente (root cause doppia)

1. `AnamnesisEditor` dereferenziava `value` undefined (draft manuali senza `data.anamnesi`;
   import senza `anamnesisText`) → schermo bianco al passo Clinica, nessuna `POST /patients`.
2. Flusso import: `handleProceedToWorkspace` scartava l'anagrafica corretta in Revisione.
   Fix frontend: editor null-tolerant + `patchDraft` dell'anagrafica dopo `createDraftFromImport`.
   E2E `e2e/issue-127-verify.mjs` 7/7 PASS.

### #128 — Camera non occupata

La cartella JSON scriveva `cameraNumero/lettoNumero` ma non creava la `PatientRoomAssignment`,
unica fonte letta da `/admin/rooms` e dalle viste occupazione → letto sempre libero.
Fix frontend: `syncCameraAssignment` (POST/PUT room-assignments) + select camere filtrate a
letti liberi. E2E `e2e/issue-128-verify.mjs` 9/9 PASS (AC1-AC4 + refresh).

### #129 — Ordinamento pazienti

Nessun ordinamento client-side nelle 4 viste (consegne/parametri/pazienti presenti/terapia);
ereditavano l'ordine `createdAt` del backend.
Fix: utility condivisa `frontend/src/lib/patientSort.ts` (`Intl.Collator('it')`, cognome→nome,
stabile) applicata alle 4 viste + roster. E2E `e2e/issue-129-verify.mjs` PASS su 4 viste + refresh.

### #130 — Voce operativa

Diario/parametri/appuntamenti + divieto Delete già coperti da SPEC-015. Gap reale: **consegne**
(mancava `create_consegna`; verbo `scriv…` non riconosciuto).
Fix: `backend/src/services/consegna-service.ts` condiviso UI+AI (FR-007), entry catalogo, matcher
`backend/src/ai/actions/consegne.ts`. Backend 222/222; E2E `e2e/issue-130-verify.mjs` 22/22
PASS (AC1-AC7; catalogo 8 azioni, **0 delete**).

## Note di processo

- **PR SPEC-015 #131** mergiata all'inizio del batch (base per #130: l'orchestratore Agnos CRU).
  Il check advisory `browser-e2e` è risultato un **drift ambientale dei runner** (fallisce
  identico su `main` liscio, runtime mock mai contattato) → aperta **#133** con analisi e fix
  suggerito (`AI_RUNTIME_URL=http://127.0.0.1:8000`). Non blocca il merge: gate/secret-scan/real-provider verdi.
- Le PR #134/#135/#136 sono state **rebasate** su main dopo i merge concorrenti (tutte toccano
  `App.tsx`), con re-run E2E post-rebase prima del merge (rispettivamente 9/9, 4-viste, 22/22).
- **#137** aperta a metà batch senza corpo né acceptance criteria; la premessa è contraddetta
  dal probe di produzione (`GET /ai/extraction/status` → `available:true, provider:google, 0 errors`).
  Marcata `status-blocked`/`needs-info`, nessun fix su premessa non riproducibile. Nota: l'orchestratore
  Agnos è **deterministico per decisione del committente** (SPEC-015 D1) e non dipende da config LLM.
- Verifica visiva del frontend di produzione (`clinicos-eosin.vercel.app`) non eseguibile da
  questa postazione (proxy Zscaler blocca il dominio); fanno fede lo stato di deploy Vercel/Railway
  via GitHub Deployments API e le evidenze E2E locali per ogni issue.

## Deploy manifest

`requirements/deployments/DEPLOY-20260704-bugbatch.md`
