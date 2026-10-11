# Task Validation Report

## Task

- Title: Somministrazione: nessuna seconda dose in fascia a dose singola dopo cambio orario
- Slug: somministrazione-nessuna-seconda-dose-in-fascia-a-dose-singola-dopo-cambio-orari
- Commit: f9767cfee (PR #431, branch codex/resolve-open-issues)
- Date: 2026-10-11

## Implementation Summary

Problema trovato dalla revisione QA indipendente della PR #431. La PR identifica la somministrazione con terapia/data/fascia/ora, ma se il medico sposta nello stesso giorno l'orario di una dose già data, la dose torna «da dare». Confermandola nasce una seconda somministrazione `erogata`.

Regola approvata dall'utente in chat il 2026-10-11 («correggi prima»): in una fascia con **una sola** dose prescritta, la registrazione del giorno è quella dose qualunque sia l'ora; vince `erogata`. Con più dosi nella fascia resta il confronto per orario esatto.

- Scrittura: `resolveAuthoritativeTherapy` espone `singleBandDose`. La conferma e la «non somministrata» cercano la registrazione esistente per fascia e rifiutano se è già `erogata`. Altrimenti aggiornano quella riga invece di crearne una seconda.
- Lettura: giro terapia (dettaglio e riepilogo per fascia) e dosi dovute/in ritardo applicano la stessa regola. Gli avvisi proattivi leggono dal giro, quindi sono coperti.
- Rimosso il fallback morto `${therapyId}|${fascia}`, che non scattava mai perché `ora` è NOT NULL.

## Files Changed

- backend/src/therapies/therapy-write.ts
- backend/src/therapies/administration-record.ts
- backend/src/therapies/therapy-slots.ts
- backend/src/therapies/due-therapy-query.ts
- backend/src/routes/**tests**/therapy-authoritative-write.test.ts (2 test nuovi)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                   |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | test «a given single dose stays given after its time moves…»: conferma 09:00 → 409, «non somministrata» → 409, 1 sola riga (08:00 erogata) |
| AC2 |   PASS | stesso test: lo slot 09:00 risulta `administered`, `findTherapiesDue` non lo elenca e il riepilogo della fascia non cambia                 |
| AC3 |   PASS | test esistente «distinct same-band doses…» (08:00/10:00 indipendenti) verde                                                                |

Prova che i test misurano il problema: con i 4 file sorgente riportati al commit precedente, i 2 test nuovi falliscono (7 pass / 2 fail). Con la correzione: 9/9.

## Test Results

| Test             | Result | Evidence                                                                                   |
| ---------------- | -----: | ------------------------------------------------------------------------------------------ |
| Unit             |   PASS | lotto correlato: 29 file, 502 test, 0 falliti, 0 saltati                                   |
| Integration      |   PASS | therapy-authoritative-write.test.ts 9/9 su Postgres locale, dati sintetici, AUTH_MODE=demo |
| API              |   PASS | stesse suite: POST /therapy-slots/confirm e /not-administered via HTTP                     |
| Playwright       |     NA | nessuna modifica UI                                                                        |
| Persistence      |   PASS | righe MedicationAdministration verificate a DB nei test                                    |
| Agnos AI         |   PASS | src/tools/**tests**/therapy*.test.ts nel lotto da 502                                      |
| Voice            |     NA |                                                                                            |
| OCR              |     NA |                                                                                            |
| Security/privacy |     NA | nessun cambio di auth; il test di scope operatori è verde                                  |

`tsc --noEmit` del backend è pulito.

## Runtime Evidence

Test HTTP reali contro il router `/therapy-slots` su Postgres locale con tutte le migrazioni applicate, inclusa `20261010190000_administration_time_identity`.

## Logs

Only sanitized logs are allowed. Gli output dei test contengono solo nomi di test e dati sintetici.

## Residual Risks

- Una fascia passata da 2 dosi a 1 nello stesso giorno con due righe già registrate: si mostra quella `erogata` (scelta conservativa: niente doppia dose).
- Le suite complete girano in CI sulla PR #431.

## Final Decision

CLOSED — VERIFIED
