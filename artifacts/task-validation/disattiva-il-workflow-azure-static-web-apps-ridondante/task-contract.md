# Task Contract

## Task

- Title: Disattiva il workflow Azure Static Web Apps ridondante
- Slug: disattiva-il-workflow-azure-static-web-apps-ridondante
- Type: config
- Date: 2026-07-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

Config/Env: unico file toccato `.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml`,
rinominato in `.disabled`. Nessun codice applicativo, nessuna variabile d'ambiente, nessun segreto
rimosso: il secret `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_HILL_02285750F` resta configurato su
GitHub, così la riattivazione è un semplice rename inverso.

## Current Behaviour

Il workflow `Azure Static Web Apps CI/CD` builda e deploya `frontend/` su una **seconda**
produzione, `orange-hill-02285750f.7.azurestaticapps.net` (risorsa `clinicos-frontend` /
`clinicos-rg`), in parallelo alla produzione dichiarata in `CLAUDE.md`, che è Vercel
(`clinicos-eosin.vercel.app`).

Su ogni pull request crea inoltre un ambiente di **staging** per l'anteprima. Il piano Free ne
consente 3. Al 2026-07-28 erano occupati da PR chiuse il 19, 20 e 25 luglio: il job di chiusura
riporta `success` a ogni chiusura di PR, ma i tre ambienti erano ancora presenti settimane dopo —
quindi quel `success` non è prova di avvenuta eliminazione.

Conseguenza osservata: `Build and Deploy Job` fallisce su **ogni** PR con
`BadRequest — This Static Web App already has the maximum number of staging environments`.
Verificato sugli ultimi 12 run del workflow: ogni PR ha una coppia `failure` (apertura) +
`success` (chiusura). Il check rosso è rumore permanente che maschera fallimenti veri.

Gli ambienti di staging residui sono già stati eliminati manualmente (resta il solo `default`), ma
senza questo intervento la quota si risatura dopo 3 PR.

## Expected Behaviour

1. Il workflow non viene più eseguito: nessun build, nessun deploy su Azure, nessun ambiente di
   staging creato. Il check `Build and Deploy Job` sparisce dalle PR.
2. La produzione frontend resta **una sola**: Vercel, deployata manualmente con
   `vercel deploy --prod --archive=tgz --yes` (invariata).
3. La disattivazione è reversibile con un rename inverso: il file resta in repo e il secret Azure
   resta configurato.
4. Nessun altro workflow è toccato: `Deploy Backend to Railway`, `AI Import E2E Gate` e
   `Frontend Secret Scan` continuano a girare.

## Acceptance Criteria

- AC1: `.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml` non esiste più con
  estensione `.yml`; esiste come `.yml.disabled` con contenuto invariato (rename puro, zero righe
  modificate), coerente con la convenzione già presente `deploy-vercel.yml.disabled`.
- AC2: dopo il merge, una nuova PR non mostra più i check `Build and Deploy Job` né
  `Close Pull Request Job`.
- AC3: gli altri workflow restano attivi e verdi sulla stessa PR (`gate`, `browser-e2e`,
  `real-provider`, `secret-scan`).
- AC4: nessun riferimento funzionale all'host Azure resta nel codice o nella configurazione
  dell'app (verificato: solo il compilatore della knowledge base e un log di esecuzione storico lo
  nominano, nessuno dei due lo usa come endpoint).

## Test Plan

| Test type                 | Required | Reason                                                                               |
| ------------------------- | -------: | ------------------------------------------------------------------------------------ |
| Unit                      |       no | Nessun codice applicativo modificato                                                 |
| Integration               |       no | Nessun codice applicativo modificato                                                 |
| API                       |       no | Nessuna rotta toccata                                                                |
| Playwright                |       no | Nessuna modifica di UI                                                               |
| Persistence after refresh |       no | Nessuna modifica di schema o dati                                                    |
| Agnos action registry     |       no | Non toccato                                                                          |
| Voice simulation          |       no | Non toccato                                                                          |
| OCR/import test           |       no | Non toccato                                                                          |
| Security/privacy scan     |      yes | Verificare che il rename non rimuova né esponga alcun secret                         |
| CI observation            |      yes | La prova vera è l'elenco dei check sulla PR di questo task: i job SWA devono sparire |

## Evidence Plan

Required evidence:

- validation-report.md con l'esito reale
- output di `git show --stat` che dimostra il rename puro (R100, nessuna riga cambiata)
- elenco dei check della PR di questo task: assenza dei job SWA, presenza e verde degli altri
- elenco degli ambienti Azure residui (`default` soltanto)
- nessuno screenshot / trace / video: nessuna UI coinvolta

## Risks

- **L'host Azure potrebbe essere usato da qualcuno.** Rischio accettato su decisione esplicita
  dell'utente (opzione 1 scelta dopo che l'alternativa "lasciare com'è" era stata presentata).
  Mitigazione: rename reversibile, secret conservato, risorsa Azure non cancellata — riattivare
  richiede un solo rename.
- **Perdita delle anteprime per PR su Azure.** Mitigato dal fatto che Vercel genera già un proprio
  preview deployment su ogni PR (check `Vercel` presente e verde nelle PR recenti).
- **Il file rinominato resta in repo**: nessun rischio di perdita della configurazione.

## Gate Status

READY FOR IMPLEMENTATION
