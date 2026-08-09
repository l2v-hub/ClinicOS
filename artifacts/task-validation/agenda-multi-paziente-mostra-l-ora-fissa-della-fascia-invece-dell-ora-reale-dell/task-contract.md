# Task Contract

## Task

- Title: Agenda multi-paziente mostra l'ora fissa della fascia invece dell'ora reale della terapia
- Slug: agenda-multi-paziente-mostra-l-ora-fissa-della-fascia-invece-dell-ora-reale-dell
- Type: fix (backend, sincronizzazione dati terapia/agenda)
- Date: 2026-08-09

## Impact Classification

| Area                 |                                                                              Impacted |
| -------------------- | ------------------------------------------------------------------------------------: |
| Frontend/UI          |                                                   yes (effetto, nessuna riga toccata) |
| Backend/API          |                             yes (una funzione pura, nessun cambio di shape/contratto) |
| Database/Persistence |                                                                                    no |
| Agnos AI / Chatbot   | no (verificato: `facility-signals.ts` legge `scheduledTime` per riga, mai `slot.ora`) |
| Auth / Permissions   |                                                                                    no |
| Privacy / Security   |                                                                                    no |
| Config / Env         |                                                                                    no |

## Contesto

Segnalazione utente: la paziente SABBATANI LILIANA ha una terapia LASIX con due somministrazioni
giornaliere (08:00 e 14:00). Nella sua cartella (tab Terapia Farmacologica) entrambe sono visibili.
Nell'agenda multi-paziente (dashboard che aggrega le terapie di TUTTI i pazienti in un'unica
vista), la dose delle 14:00 "non si vede".

**Investigazione (agente Explore reale + verifica diretta del coordinatore contro il database di
produzione, sola lettura, sui dati reali della paziente nominata)**:

- **I dati NON sono persi**: query diretta su Postgres di produzione conferma due `TherapySchedule`
  distinti e corretti — `{time:"08:00", fascia:"mattina"}` e `{time:"14:00", fascia:"pomeriggio"}` —
  entrambi con il flag booleano corrispondente (`fasceMattina`/`fascePomeriggio`) correttamente
  impostato. Nessuna collisione di chiave, nessuna riga sovrascritta.
- **Causa reale**: `buildTherapySlots()` (`backend/src/therapies/therapy-slots.ts`) raggruppa le
  somministrazioni in 5 fasce fisse (mattina/pranzo/pomeriggio/sera/notte) e assegna a ciascuna
  fascia un `ora` SEMPRE fisso (`f.ora`: 08:00/12:00/**16:00**/20:00/22:00), indipendentemente
  dall'orario reale delle dosi al suo interno. L'agenda (`AdminAgenda.tsx`) e' una griglia oraria a
  passo di 30 minuti (`TIME_SLOTS`, 08:00–18:30) che posiziona ogni fascia nella riga corrispondente
  al suo `ts.ora` (`AdminAgenda.tsx:121,138`). La fascia "Pomeriggio" di SABBATANI (dose reale
  14:00) viene quindi sempre posizionata/etichettata alla riga 16:00, non 14:00 — un utente che
  scorre la griglia cercando "14:00" non trova nulla li', anche se il dato esiste (visibile aprendo
  il dettaglio della fascia, `TherapySlotModal.tsx:123`, che mostra gia' `a.scheduledTime`
  correttamente per riga).
- **Verificato non-impatto su Agnos**: `facility-signals.ts`'s `collectTherapiesDue()` (usata da
  `get_facility_snapshot`/`get_operator_queue`, ciclo precedente) legge
  `paziente.administrazioni[].scheduledTime` per ogni singola riga, MAI `slot.ora` — le risposte di
  Agnos su terapie in ritardo/in scadenza sono gia' corrette oggi e restano tali dopo questo fix.

## Expected Behaviour

Ogni fascia nell'agenda multi-paziente viene posizionata/etichettata all'orario REALE piu'
imminente tra le somministrazioni che contiene, non a un orario fisso arbitrario. Per SABBATANI: la
fascia "Pomeriggio" appare/e' etichettata alle 14:00 (l'orario reale della sua dose), non piu' alle
16:00. Se la fascia e' vuota (nessuna somministrazione), resta l'orario di default della fascia
(comportamento invariato — serve comunque un ancoraggio per una fascia senza contenuto).

## Acceptance Criteria

### Verificati staticamente

- AC1 — `buildTherapySlots()` calcola `ora` come il minimo tra gli `scheduledTime` reali delle
  somministrazioni della fascia (quando non vuota), non piu' sempre `f.ora`.
- AC2 — Nessun cambio di shape del tipo `TherapySlot`/`TherapySlot[]` (stesso numero di elementi,
  stessi `id`, stessa `fascia`) — zero rottura di contratto per gli altri consumatori
  (`TerapiaFarmacologicaTab.tsx`, `facility-signals.ts`, le rotte di conferma/non-erogata).
- AC3 — `facility-signals.ts` invariato — nessuna modifica necessaria (verificato che non legge
  `slot.ora`).
- AC4 — Nuovo test unitario: una fascia con somministrazioni a orari diversi (es. 14:00 e 16:00)
  produce `ora === "14:00"` (il minimo), non il default fisso della fascia.
- AC5 — `npx tsc --noEmit`, `npm run build`, test backend/frontend invariati/verdi.

### Aperti — verificati a runtime nel validation-report

- AC-R1: nell'agenda (mock con due pazienti, uno con dose Pomeriggio a orario di default e uno con
  dose Pomeriggio anticipata), la fascia si posiziona/etichetta all'orario reale piu' imminente.
- AC-R2: il dettaglio della fascia (modal) mostra ancora correttamente l'orario per-riga (nessuna
  regressione — gia' corretto oggi).
- AC-R3: zero errori console.

## Test Plan

| Test type                 | Required | Reason                                                                                  |
| ------------------------- | -------: | --------------------------------------------------------------------------------------- |
| Unit                      |      yes | funzione pura `buildTherapySlots()`/logica di calcolo `ora`, pattern esistente          |
| Integration               |       no | nessuna nuova integrazione                                                              |
| API                       |       no | nessun cambio di rotta/contratto                                                        |
| Playwright                |      yes | comportamento di posizionamento RENDERIZZATO nell'agenda, non verificabile staticamente |
| Persistence after refresh |       no | nessuna modifica al modello dati                                                        |
| Agnos action registry     |       no | non tocca Agnos (verificato)                                                            |
| Security/privacy          |       no | nessun dato coinvolto                                                                   |

## Risks

**R1 — Piu' orari reali diversi nella stessa fascia restano raggruppati sotto un'unica posizione
(la piu' precoce).** Se "Pomeriggio" contiene sia una dose a 14:00 sia una a 16:00 di pazienti
diversi, la card si posiziona a 14:00 e contiene ENTRAMBE le dosi (non due card separate). Non e'
un redesign completo della griglia (fuori ambito per un fix mirato) ma e' un miglioramento netto
rispetto a oggi (sempre e comunque sbagliato) — un utente che scorre dalle 14:00 in poi trova la
card, anche se il dettaglio esatto per-paziente resta nel modal (gia' corretto). Documentato, non
nascosto.

**R2 — Fuori ambito, deliberatamente.** Un redesign della griglia per posizionare ogni singola
somministrazione al proprio orario esatto (invece di raggruppare per fascia) e' una modifica di
shape/contratto piu' ampia, con impatto su piu' consumatori (`TerapiaFarmacologicaTab.tsx`,
`TherapySlotModal.tsx`, le rotte di conferma) — non in questo ciclo.

## Gate Status

READY FOR IMPLEMENTATION (implementazione gia' in corso, verifica runtime a seguire)
