# Task Validation Report

## Task

- Title: Codice fiscale chiave univoca paziente
- Slug: codice-fiscale-chiave-univoca-paziente
- Issue: #294
- Commit: (branch `feat/cf-chiave-univoca-paziente`)
- Date: 2026-07-20

## Implementation Summary

- `prisma/schema.prisma` + migration `20260720160000_patient_codice_fiscale`: colonna
  `Patient.codiceFiscale TEXT` UNIQUE (nullable per i record legacy), con backfill prudente dal
  JSON cartella (solo CF ben formati e non ambigui).
- `backend/src/lib/codice-fiscale.ts`: validatore senza dipendenze (struttura + carattere di
  controllo, omocodie accettate) + test unitari (`backend/src/__tests__/codice-fiscale.test.ts`).
- `backend/src/routes/patients.ts`: POST richiede CF valido (400) e libero (409, incl. gara P2002
  discriminata per target); PATCH consente aggiornamento CF con stessa validazione.
- `backend/src/ai/upload/confirm-service.ts`: `requireFreeCodiceFiscale` su ENTRAMBE le vie di
  conferma (draft intake + import job) prima della creazione; match CF = duplicato rigido non
  forzabile con confirmDuplicate; CF normalizzato persistito in colonna e in cartella.
- Frontend: `lib/codiceFiscale.ts` (validazione live + calcolo con `codice-fiscale-js`, dipendenza
  approvata dal PO); `NewPatientModal` e `StepAnagrafica` con campo Comune di nascita e pulsante
  "Calcola", CF obbligatorio con messaggi di errore; gate step-1 wizard (`anagraficaValid`);
  payload POST con CF; tipo `Paziente.codiceFiscale`.
- Flussi e2e/CI aggiornati al CF obbligatorio: `e2e/import-e2e.mjs`, `new-vs-existing-smoke.mjs`
  (CF alternativo per l'euristica nome+data), `therapy-import-api.mjs`, `import-happy-path.mjs`
  (CF per viewport + pre-clean via API), `scripts/e2e-full-patient-api-test.ts` (CF corretto:
  il vecchio valore aveva il carattere di controllo errato). Spec QA: `issue-282` aggiornata,
  nuova `issue-294.spec.ts` (calcolo, blocco senza CF, duplicato rifiutato, persistenza colonna).

## Files Changed

Vedi diff del branch `feat/cf-chiave-univoca-paziente` (26 file).

## Acceptance Criteria Result

| AC                                               |       Result | Evidence                                                          |
| ------------------------------------------------ | -----------: | ----------------------------------------------------------------- |
| AC1 colonna unique + migration/backfill          |  IMPLEMENTED | migration applicata al DB e2e locale (ALTER+INDEX ok)             |
| AC2 POST 400/409 + persistenza normalizzata      |  IMPLEMENTED | route + unit CF 5/5                                               |
| AC3 conferme intake/import, dup CF non forzabile |  IMPLEMENTED | test `confirmDraft: blocks a missing CF and a duplicate CF` verde |
| AC4 UI validazione + Calcola                     |  IMPLEMENTED | spec `issue-294.spec.ts` (da eseguire nel gate QA)                |
| AC5 persistenza colonna + reload                 |  IMPLEMENTED | assert API/reload nella spec 294                                  |
| AC6 suite verdi                                  | PASS (build) | backend 361/361; tsc 0 errori; vite build ok                      |

## Test Results

| Test                                        |          Result | Evidence                                   |
| ------------------------------------------- | --------------: | ------------------------------------------ |
| Unit backend (incl. 6 nuovi CF + 1 confirm) |    PASS 361/361 | run locale con Postgres e2e :5433          |
| Frontend tsc + build                        |            PASS | 0 errori; build 16.5s                      |
| Playwright                                  | PENDING QA GATE | spec `qa-evidence/tests/issue-294.spec.ts` |
| CI e2e (mock import flows)                  |   PENDING PR CI | flussi aggiornati con CF sintetici         |

## Residual Risks

- Calcolo CF dipende dal catalogo comuni della libreria: comune non riconosciuto → messaggio
  esplicito, il CF resta digitabile a mano.
- Record legacy/seed con CF NULL restano validi (vincolo nullable); da bonificare via PATCH.

## Final Decision

IMPLEMENTED — NOT VERIFIED

(In attesa del gate QA interno indipendente: riesecuzione spec Playwright + review diff +
security checklist. Il verdetto finale arriva dal QA, non dall'implementatore.)
