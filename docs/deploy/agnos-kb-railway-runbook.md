# Deploy runbook — Agnos Knowledge Base (PR #255)

**Stato:** PREPARATO — eseguire SOLO dopo QA PASS di Codex su PR #255 e merge su `main`.
Claude non merge/deploy: questi comandi li lancia l'operatore (o Codex) quando autorizzato.

## Cosa cambia questo deploy
- **Backend**: 7 nuovi intent read Agnos + clarify + `OperatorShift` (turni persistiti).
- **DB**: 1 migration additiva `20260710090000_operator_shifts` (nuova tabella, nessuna modifica a tabelle esistenti).
- **Env**: 1 variabile NON-segreta `AI_FACILITY_QUERIES_ENABLED=true` (abilita gli intent camere `rooms_occupancy`/`rooms_occupants`; senza, rispondono con rifiuto — gate fail-closed).
- **Frontend (Vercel)**: chips clarify — deploy automatico all'integrazione Git su merge, nessuna env nuova.

## Meccanica (già configurata nel repo)
- `railway.json` → `startCommand: prisma migrate deploy && node backend/dist/server.js` → **la migration si applica da sola a ogni deploy**.
- `.github/workflows/deploy-backend.yml` → deploy backend automatico su push a `main` quando cambiano `prisma/**` o `backend/**` (entrambi cambiano con questo merge).
- `.github/workflows/railway-set-var.yml` → imposta una var NON-segreta e forza un redeploy (il sandbox non raggiunge Railway per TLS interception → si passa da GitHub Actions).
- Prereq verificati: secret `RAILWAY_TOKEN` ✓ · variabile `RAILWAY_SERVICE=clinicos-backend` ✓ · URL prod backend `https://clinicos-backend-production-df88.up.railway.app`.

## Sequenza di esecuzione (post-merge)

### 1. Merge PR #255 su main (fatto da Codex/operatore)
Al merge parte da solo `Deploy Backend to Railway` → build → `prisma migrate deploy` (crea `OperatorShift`) → avvio.

### 2. Attendere che il deploy backend finisca e la migration risulti applicata
```bash
gh run list --repo l2v-hub/ClinicOS --workflow "Deploy Backend to Railway" --limit 1
gh run watch <run-id> --repo l2v-hub/ClinicOS      # attende il completamento
```
Nei log del deploy deve comparire l'applicazione della migration `20260710090000_operator_shifts`.

### 3. Impostare la variabile d'ambiente (redeploy con la var attiva)
```bash
gh workflow run "Railway Set Backend Variable" --repo l2v-hub/ClinicOS \
  -f key=AI_FACILITY_QUERIES_ENABLED -f value=true
gh run watch <run-id> --repo l2v-hub/ClinicOS
```
> È NON-segreta → supera il filtro anti-secret del workflow. Railway persiste la variabile fra i deploy; questo dispatch forza un redeploy del codice mergiato con la var già presente.

## Verifica post-deploy (dall'ambiente dell'operatore / dall'app, il sandbox non raggiunge prod)

**A. Health**
```bash
curl -s https://clinicos-backend-production-df88.up.railway.app/health
# atteso: {"status":"ok"}
```

**B. Intent camere (gate abilitato) — deve NON essere un rifiuto**
```bash
curl -s -X POST https://clinicos-backend-production-df88.up.railway.app/ai/actions/plan \
  -H "Content-Type: application/json" \
  -H "X-Operator-Id: qa" -H "X-Operator-Role: operatore" \
  -d '{"text":"quante camere sono occupate oggi","channel":"testo"}'
# atteso: plan.actionType="read", read.intent="rooms_occupancy", read.notFound=false,
#         results[0] con conteggi numerici, NESSUN nome paziente (aggregato)
```

**C. Turni (nuova tabella funzionante)**
```bash
curl -s https://clinicos-backend-production-df88.up.railway.app/operator-shifts
# atteso: {"shifts":[...]} (200; lista vuota è ok su DB nuovo — la tabella esiste)
```

**D. Nell'app (Vercel)**: aprire Agnos, chiedere "quante camere sono occupate oggi" → risposta con aggregato sourced (non "Informazione non trovata"); "chi è di turno oggi?" → risposta turni.

## Rollback
- **Env**: rimettere `AI_FACILITY_QUERIES_ENABLED=false` con lo stesso workflow set-var (gli intent camere tornano a rifiutare; nessun crash). 
- **Codice**: `git revert` del merge di #255 su main → il deploy-backend redeploya la versione precedente. La migration additiva `OperatorShift` può restare (tabella inutilizzata, innocua) — un revert dello schema NON è necessario e Prisma non fa auto-down su `migrate deploy`.

## Note
- La migration è additiva e nullable-safe: le terapie/dati esistenti non sono toccati.
- Segreti (Azure/Gemini/DB) invariati — nessuna nuova credenziale richiesta da questa feature.
- Se `prisma migrate deploy` fallisse (history prod incoerente), il deploy si ferma prima dell'avvio: controllare i log Railway e lo stato di `_prisma_migrations` prima di ritentare.
