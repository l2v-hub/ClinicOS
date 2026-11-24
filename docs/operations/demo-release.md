# ClinicOS: rilascio di `main` sulla demo `clinicos-eosin.vercel.app`

Dal 2026-11-19 l'utente ha scelto di rivedere `main` anche sulla demo precedente
(`https://clinicos-eosin.vercel.app`, backend `https://clinicos-backend-production-df88.up.railway.app`).
Il sito development (`docs/operations/development-release.md`) resta una destinazione separata: lo
stesso `main` funziona su entrambi, perché `frontend/vercel.json` ammette i backend dei due siti.

Il rilascio lo esegue l'operatore con i propri accessi Vercel/Railway. Una sessione cloud non ha
credenziali né rete verso quei servizi: prepara la sorgente e non dichiara nulla «online» senza
un riscontro dal sito.

**Target verificati al rilascio del 2026-11-21** (registro:
`artifacts/task-validation/rilascio-di-main-sulla-demo-clinicos-eosin/logs/release-log.md`):

- Vercel: progetto `clinicos__` (`prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6`, team
  `team_P8yHboFntuOI9pT0zdgbJAqU`), root `frontend`, deploy da Git disattivati; il dominio
  `clinicos-eosin.vercel.app` è dichiarato sul progetto, quindi ogni deploy `--prod` lo riprende.
- Railway: progetto «glistening-friendship», ambiente `production`, servizio `clinicos-backend`
  (`…-df88`), database `Postgres` (`${{Postgres.DATABASE_URL}}`), runtime `clinicos-ai-runtime`.
  L'ambiente «demo» (`clinicos-backend-demo.up.railway.app`) non esiste più: il workflow
  `deploy-demo-exact-commit.yml` punta ancora a quell'ambiente e non va usato.
- **Trappola**: `VITE_API_URL` salvata su Vercel (sensibile, illeggibile) vale ancora
  `https://clinicos-backend-demo.up.railway.app`. Una build fatta da Vercel produce un sito senza
  backend. Correggila nel progetto (Settings → Environment Variables) con
  `https://clinicos-backend-production-df88.up.railway.app`, oppure costruisci in locale come al
  punto 2 sostituendo il valore in `.vercel/.env.production.local` prima di `vercel build`.
- Se la demo è stata spenta: `Postgres` e `clinicos-ai-runtime` vanno riaccesi (Redeploy
  dell'ultimo deployment, stessa immagine) prima del backend, altrimenti le migrazioni falliscono
  con `P1001`.

## Ordine

Backend, poi frontend. Il frontend nuovo chiama rotte che il backend vecchio non ha (bozze
d'ingresso con `duplicateOfId`, «Elimina bozza», dati sintetici).

## 1. Backend (Railway)

Il workflow **Deploy Backend to Railway** (`.github/workflows/deploy-backend.yml`) è disattivato a
mano dal 2026-11-08. Due strade:

- **Da GitHub**: Actions → «Deploy Backend to Railway» → _Enable workflow_ → _Run workflow_ su
  `main`. Esegue `railway up --ci`; prima dell'avvio Railway lancia `npm run db:migrate`
  (`railway.json`), che applica le migrazioni mancanti, solo in avanti. Attenzione: finché resta
  attivo riparte a ogni push su `main` che tocca `backend/**` o `prisma/**`; se non lo vuoi,
  disattivalo di nuovo dopo il rilascio.
- **Dalla postazione**, con la CLI collegata al progetto della demo:

  ```bash
  railway up --ci
  ```

Controlli:

```bash
curl -s https://clinicos-backend-production-df88.up.railway.app/health
```

- Variabili del servizio: `FRONTEND_URL` (o `FRONTEND_URLS`) deve contenere
  `https://clinicos-eosin.vercel.app`, altrimenti il browser riceve errori CORS.
- Le API dei dati sintetici rispondono 403 se l'ambiente non è dichiarato di prova
  (`CLINICOS_ENV=demo` e `DEMO_DATASET_ID=synthetic-v1`, vedi `docs/synthetic-data-api.md`).
- Runtime AI: serve un rilascio («Deploy AI Runtime to Railway», anch'esso disattivato) solo se
  vuoi sulla demo anche la correzione della trascrizione vocale entrata con #532.

### Scadenza del 1° dicembre 2026: dove stanno le impostazioni del servizio

Railway ha ritirato i file `railway.json` / `railway.toml`
([documentazione](https://docs.railway.com/infrastructure-as-code)): «Existing Config as Code files
stop being read on 2026-12-01 (hard cutoff)». Fino a quella data, a ogni rilascio, i valori del file
prevalgono su quelli salvati nel servizio (Railway → servizio → Settings); dopo valgono solo quelli
salvati. Il formato nuovo (`.railway/railway.ts`) non è obbligatorio e gestisce l'intero progetto:
applicandolo si possono eliminare le risorse non dichiarate (database, volumi). Qui non lo usiamo.

Sulla demo le impostazioni salvate dei due servizi (ambiente `production`) sono state allineate ai
file il 2026-11-24, con l'API `serviceInstanceUpdate` (non avvia un rilascio):

| Servizio              | Impostazione     | Valore salvato (uguale al file)                                           | Prima del 2026-11-24                                          |
| --------------------- | ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `clinicos-backend`    | Build command    | `npm install --include=dev --no-audit --no-fund && npm run build:backend` | `npm install && npx prisma generate && npm run build:backend` |
| `clinicos-backend`    | Pre-deploy       | `npm run db:migrate`                                                      | `npx prisma migrate deploy`                                   |
| `clinicos-backend`    | Start command    | `node backend/dist/server.js`                                             | `npm --prefix backend run start`                              |
| `clinicos-backend`    | Healthcheck path | `/health`                                                                 | `/health`                                                     |
| `clinicos-backend`    | Restart          | On failure, 3 tentativi                                                   | On failure, 10 tentativi                                      |
| `clinicos-ai-runtime` | Dockerfile path  | `Dockerfile` (root directory `/clinicos-ai-runtime`)                      | `/clinicos-ai-runtime/Dockerfile`                             |
| `clinicos-ai-runtime` | Start command    | `python -m clinicos_ai.main`                                              | vuoto                                                         |
| `clinicos-ai-runtime` | Healthcheck path | `/v1/runtime/health`                                                      | `/v1/runtime/health`                                          |
| `clinicos-ai-runtime` | Restart          | On failure, 3 tentativi                                                   | On failure, 10 tentativi                                      |

Provato lo stesso giorno con un rilascio di entrambi i servizi da sorgenti senza i due
`railway.json`: riusciti, nessun file di configurazione letto, impostazioni effettive identiche a
quelle dei rilasci precedenti (evidenze in
`artifacts/task-validation/railway-impostazioni-dei-servizi-prima-della-scadenza-del-1-dicembre/`).

Da ricordare:

- Dal 1° dicembre 2026 **la fonte delle impostazioni è il servizio su Railway**, non più il file.
  Una modifica a build, migrazione, avvio, controllo di salute o riavvio va fatta lì (Settings del
  servizio) e riportata in questa tabella.
- I due `railway.json` restano nel repository perché sono citati dai flussi di rilascio, dalla
  pipeline dei bug e dalla documentazione generata; dopo la scadenza Railway li ignora. Fino ad
  allora prevalgono ancora: tenerli uguali alla tabella.
- Il valore più delicato è la build del backend: il servizio ha `NODE_ENV=production`, quindi senza
  `--include=dev` mancano gli strumenti di compilazione e la build fallisce.

## 2. Frontend (Vercel)

Dalla radice del repository, su `main` aggiornato:

```bash
git checkout main
```

```bash
git pull
```

```bash
npx vercel link
```

Scegli il progetto che ha l'alias `clinicos-eosin.vercel.app`, poi:

```bash
npx vercel pull --yes --environment=production
```

```bash
npx vercel build --prod
```

```bash
npx vercel deploy --prebuilt --prod
```

In alternativa, dalla dashboard Vercel del progetto: Deployments → nuovo deployment di `main` in
Production.

`VITE_API_URL` del progetto deve puntare al backend della demo; se manca, il frontend usa già quel
backend come valore predefinito in produzione (`frontend/src/config.ts`).

## 3. Verifica sul sito

- Apri `https://clinicos-eosin.vercel.app` e ricarica senza cache (Ctrl+Shift+R).
- Accedi, apri Turno, Pazienti, una cartella, «Nuovo ingresso» a mano.
- Console del browser senza errori «Content Security Policy» o CORS.
- Dati: non lanciare `POST /admin/synthetic-data/wipe` né il seed senza averlo deciso; il seed
  riporta ai valori iniziali i record di base, il wipe cancella tutti i dati operativi.
