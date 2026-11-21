# Registro del rilascio (2026-11-20/21, UTC)

Commit pubblicato: `1a805c83f4fb7f38b4e1e6e3053af17dc2e8dabd` (`main`, merge di #538).
Credenziali: token Vercel e Railway inseriti dall'utente nel modulo sicuro dell'ambiente cloud
«ClinicOS», iniettati dal proxy; nessun valore in questo repository o nei log.

## Stato trovato

| Elemento | Stato |
| --- | --- |
| `clinicos-eosin.vercel.app` | 404 `DEPLOYMENT_NOT_FOUND` (alias staccato; ultimo deployment che lo portava: `dpl_4EBkNC1HAwHjjxJWWgWBJ2wSSDxu`, commit `b5e79ae7`) |
| Vercel progetto | `clinicos__` `prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6`, team `team_P8yHboFntuOI9pT0zdgbJAqU`, root `frontend`, deploy da Git disattivati |
| Vercel `VITE_API_URL` (production, sensibile) | `https://clinicos-backend-demo.up.railway.app` (letto dal bundle di una build Vercel) |
| Railway progetto | «glistening-friendship» `bddf5d1b-…`, ambiente `production` `235fd681-…` |
| `clinicos-backend` `c000f011-…` | deployment `8d463a22` fermato a mano; `…-df88` risponde 502 |
| `Postgres` `11a104b2-…` (usato dal backend: `${{Postgres.DATABASE_URL}}`) | fermato a mano; volume 580 MB intatto |
| `clinicos-ai-runtime` `2fa67280-…` | fermato a mano |
| Ambiente Railway «demo» `8021987e-…` (`clinicos-backend-demo`) | senza servizi: «Application not found» |

## Passi eseguiti

1. Vercel, anteprima (non produzione) di `main`: `dpl` `clinicos-jy61p738r-…` READY.
2. Railway, backend `serviceInstanceDeployV2` commit `1a805c83`:
   - `041b9055` FAILED: build OK, push dell'immagine nel registro Railway fallito (infrastruttura);
   - `bdafccec` FAILED: `P1001 Can't reach database server at postgres.railway.internal` (database fermo).
3. Railway, `Postgres` riavviato con la stessa immagine (`deploymentRedeploy` → `f0d450ce`, SUCCESS;
   recupero automatico, «ready to accept connections»).
4. Railway, `clinicos-ai-runtime` riavviato con la stessa immagine del 3 ottobre (`7e2ae741`, SUCCESS).
5. Railway, backend commit `1a805c83` → `692f44ec` SUCCESS: «59 migrations found», «No pending
   migrations to apply», «listening on port 8080».
6. Vercel, produzione costruita da Vercel `dpl_AHgkbib2UrigLV3Y9K1B148kfTVy`: il bundle usava
   `clinicos-backend-demo` (servizio inesistente) → sostituito.
7. Dominio `clinicos-eosin.vercel.app` aggiunto al progetto `clinicos__` (verified).
8. Vercel, build locale con `VITE_API_URL=https://clinicos-backend-production-df88.up.railway.app`
   (solo nel file locale `.vercel/.env.production.local`, ignorato da git), poi
   `deploy --prebuilt --prod` → `dpl_HEvo2xFKVzPQrXJbfYhn9FVkwmis` READY, alias
   `clinicos-eosin.vercel.app` su questo deployment.

## Non toccato

Variabili Railway e Vercel salvate (compreso `VITE_API_URL`), dati della demo (nessun seed, wipe o
SQL), servizi `Postgres-bbbY` e `clinicos-readonly-…`, workflow GitHub (restano disattivati).
