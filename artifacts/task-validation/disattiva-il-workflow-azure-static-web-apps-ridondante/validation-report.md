# Task Validation Report

## Task

- Title: Disattiva il workflow Azure Static Web Apps ridondante
- Slug: disattiva-il-workflow-azure-static-web-apps-ridondante
- Commit: branch `chore/disattiva-workflow-azure-swa` → PR #309
- Date: 2026-07-28

## Implementation Summary

Rinominato `.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml` in `.yml.disabled`
(`git mv`, rename puro), stessa convenzione del già presente `deploy-vercel.yml.disabled`.

Intervento complementare, eseguito prima del rename: eliminati via `az staticwebapp environment
delete` i 3 ambienti di staging residui (PR #264 chiusa il 19/07, #291 mergiata il 20/07, #299
mergiata il 25/07), che saturavano la quota del piano Free. `default` (produzione) non toccato.

## Files Changed

| File                                                                                  | Tipo                            |
| ------------------------------------------------------------------------------------- | ------------------------------- |
| `.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml` → `.yml.disabled` | rinominato (0 righe modificate) |

Nessun codice applicativo toccato. Nessun secret rimosso.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                 |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | `git show --stat HEAD` riporta il rename con `0` righe modificate (rename puro). Il file esiste solo come `.yml.disabled`; nessun `.yml` Azure resta in `.github/workflows/`                                             |
| AC2 |   PASS | `logs/pr-309-checks.txt` — sulla PR #309 i check `Build and Deploy Job` e `Close Pull Request Job` **non compaiono più**. Erano presenti su tutte le PR precedenti, col primo rosso                                      |
| AC3 |   PASS | `logs/pr-309-checks.txt` — `CI Checks Summary: Passed 6, Failed 0`: `gate`, `browser-e2e`, `real-provider`, `secret-scan`, `Vercel`, `Vercel Preview Comments` tutti verdi                                               |
| AC4 |   PASS | Ricerca in repo di `orange-hill` / `azurestaticapps` / `clinicos-frontend`: 2 soli riscontri — `scripts/nhw/lib/knowledge-compiler.mjs` e un log storico in `.openclode/runs/`. Nessuno dei due usa l'host come endpoint |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                                                   |
| ---------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |     NA | Nessun codice applicativo modificato                                                                                                                                                                       |
| Integration      |     NA | Nessun codice applicativo modificato                                                                                                                                                                       |
| API              |     NA | Nessuna rotta toccata                                                                                                                                                                                      |
| Playwright       |     NA | Nessuna modifica di UI                                                                                                                                                                                     |
| Persistence      |     NA | Nessuna modifica di schema o dati                                                                                                                                                                          |
| Agnos AI         |     NA | Non toccato                                                                                                                                                                                                |
| Voice            |     NA | Non toccato                                                                                                                                                                                                |
| OCR / Import     |     NA | Non toccato                                                                                                                                                                                                |
| Security/privacy |   PASS | Rename puro: nessun secret rimosso, modificato o esposto. `AZURE_STATIC_WEB_APPS_API_TOKEN_ORANGE_HILL_02285750F` resta configurato su GitHub (citato per nome, mai per valore). Check `secret-scan` verde |
| CI observation   |   PASS | `logs/pr-309-checks.txt` — 6 pass / 0 fail, job SWA assenti                                                                                                                                                |

## Runtime Evidence

| Verifica                       | Esito                                                     |
| ------------------------------ | --------------------------------------------------------- |
| Ambienti Azure dopo la pulizia | solo `default` (`logs/azure-environments.txt`)            |
| Check sulla PR #309            | 6 pass, 0 fail, nessun job SWA (`logs/pr-309-checks.txt`) |
| Rename puro                    | `git show --stat` → 0 righe modificate sul workflow       |

Risorsa Azure: `clinicos-frontend` / `clinicos-rg`, sottoscrizione "Azure subscription 1" — non
quella di default della CLI, motivo per cui `az staticwebapp list` senza `--subscription` non
restituiva nulla.

## Logs

- `logs/pr-309-checks.txt`
- `logs/azure-environments.txt`

Nessun dato clinico, nessun valore di segreto.

## Residual Risks

1. **L'host Azure non è più aggiornato.** Se qualcuno lo usasse ancora, resterebbe fermo all'ultimo
   deploy. Rischio accettato su decisione esplicita dell'utente. Riattivazione: rename inverso — il
   file è in repo, il secret è configurato, la risorsa Azure non è stata cancellata.
2. **Causa radice della mancata pulizia non accertata.** Il `Close Pull Request Job` riportava
   `success` senza eliminare gli ambienti; l'ipotesi (assenza di `repo_token` nel job di chiusura)
   non è stata verificata. Irrilevante finché il workflow resta disattivato, ma va ripresa se un
   giorno lo si riattiva.
3. **La risorsa Azure continua a esistere** e può generare costi. Non è stata cancellata: fuori
   dallo scope di questo task e decisione dell'utente.

## Final Decision

CLOSED — VERIFIED
