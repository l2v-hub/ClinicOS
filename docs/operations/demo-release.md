# ClinicOS: rilascio di `main` sulla demo `clinicos-eosin.vercel.app`

Dal 2026-11-19 l'utente ha scelto di rivedere `main` anche sulla demo precedente
(`https://clinicos-eosin.vercel.app`, backend `https://clinicos-backend-production-df88.up.railway.app`).
Il sito development (`docs/operations/development-release.md`) resta una destinazione separata: lo
stesso `main` funziona su entrambi, perché `frontend/vercel.json` ammette i backend dei due siti.

Il rilascio lo esegue l'operatore con i propri accessi Vercel/Railway. Una sessione cloud non ha
credenziali né rete verso quei servizi: prepara la sorgente e non dichiara nulla «online» senza
un riscontro dal sito.

**Non verificato da chi ha scritto questa pagina** (da controllare al primo rilascio): a quale
progetto Railway punta il segreto `RAILWAY_TOKEN` di GitHub; quale progetto Vercel serve l'alias
`clinicos-eosin.vercel.app` (i manifest di giugno lo chiamano `clinicos__`; il workflow archiviato
`deploy-vercel.yml.disabled` riporta `prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6` nel team
`team_P8yHboFntuOI9pT0zdgbJAqU`); quale commit la demo sta servendo oggi.

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
