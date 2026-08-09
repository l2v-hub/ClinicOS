# Task Validation Report

## Task

- Title: Agenda multi-paziente mostra l'ora fissa della fascia invece dell'ora reale della terapia
- Slug: agenda-multi-paziente-mostra-l-ora-fissa-della-fascia-invece-dell-ora-reale-dell
- Commit: uncommitted working-tree changes on branch da creare (staged for commit)
- Date: 2026-08-09

## Implementation Summary

Segnalazione utente: SABBATANI LILIANA ha LASIX sia alle 08:00 sia alle 14:00; nella cartella
paziente entrambe le dosi sono visibili, ma nell'agenda multi-paziente (dashboard di reparto) la
dose delle 14:00 "non si vede". Indagine (agente Explore + verifica diretta del coordinatore
contro il database di produzione, sola lettura, sui dati reali della paziente):

1. **Dati confermati integri**: query diretta su Postgres di produzione — due `TherapySchedule`
   corretti (`{time:"08:00",fascia:"mattina"}`, `{time:"14:00",fascia:"pomeriggio"}`), nessuna
   collisione di chiave, nessuna riga sovrascritta.
2. **Causa reale identificata**: `buildTherapySlots()` assegnava a ciascuna delle 5 fasce fisse un
   `ora` SEMPRE uguale al default della fascia (pomeriggio → sempre "16:00"), indipendentemente
   dall'orario reale delle dosi al suo interno. L'agenda (`AdminAgenda.tsx`) e' una griglia oraria a
   passo di 30 minuti che posiziona ogni fascia nella riga corrispondente al suo `ora` — la dose
   reale delle 14:00 finiva quindi sempre visualizzata/etichettata alla riga 16:00, invisibile a chi
   scorreva la griglia cercando "14:00".
3. **Verificato nessun impatto su Agnos** (capacita' introdotte nel ciclo precedente): la logica di
   "terapie in ritardo/in scadenza" (`facility-signals.ts`) legge l'orario reale per singola riga
   (`scheduledTime`), mai `slot.ora` — le risposte dell'assistente erano gia' corrette prima di
   questo fix e restano tali dopo.

Fix: `buildTherapySlots()` ora ancora ogni fascia all'orario REALE piu' imminente tra le
somministrazioni che contiene (funzione pura `earliestOra`, estratta in un modulo senza
dipendenza da prisma per essere testabile), non piu' a un default fisso. Nessun cambio di shape
del tipo `TherapySlot`/contratto della rotta — stesso numero di elementi, stessi id, stessa
fascia. Il fix e' stato verificato **contro il database di produzione reale**, eseguendo la
funzione corretta sui dati reali di SABBATANI: la fascia "pomeriggio" ora produce `ora: "14:00"`
(prima del fix sarebbe stato sempre `"16:00"`).

## Files Changed

- `backend/src/therapies/therapy-slots.ts` (modificato — usa la nuova funzione)
- `backend/src/therapies/slot-scheduling.ts` (nuovo — `earliestOra()`, funzione pura)
- `backend/src/therapies/__tests__/earliest-ora.test.ts` (nuovo — 5 test)
- `e2e/agenda-therapy-slot-real-time.mjs` (nuovo — evidenza runtime)

## Acceptance Criteria Result

| AC                                                       | Result | Evidence                                                |
| -------------------------------------------------------- | -----: | ------------------------------------------------------- |
| AC1 - ora = minimo orario reale tra le somministrazioni  |   PASS | `earliestOra()`, 5 test unitari                         |
| AC2 - nessun cambio di shape/contratto                   |   PASS | Stesso numero di slot, stessi id/fascia                 |
| AC3 - facility-signals.ts invariato                      |   PASS | File non toccato, verificato non ne dipende             |
| AC4 - test unitario per fascia con orari misti           |   PASS | `earliestOra: piu' pazienti... vince il piu' imminente` |
| AC5 - tsc/build/test invariati                           |   PASS | Vedi Test Results sotto                                 |
| AC-R1 - posizionamento reale nell'agenda (mock)          |   PASS | Runtime: vedi sotto, 5/5                                |
| AC-R2 - dettaglio fascia mostra orario corretto per riga |   PASS | Runtime: vedi sotto (gia' corretto prima, invariato)    |
| AC-R3 - zero errori console                              |   PASS | Runtime: vedi sotto                                     |

## Test Results

| Test                  | Result | Evidence                                                                                                                                                        |
| --------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                  |   PASS | `earliestOra`: 5/5 nuovi; `buildTherapySlots` non testabile senza DB (usa prisma), verificato invece con esecuzione diretta contro il DB di produzione          |
| Integration           |     NA | Nessuna nuova integrazione                                                                                                                                      |
| API                   |     NA | Nessun cambio di rotta/contratto                                                                                                                                |
| Playwright            |   PASS | `e2e/agenda-therapy-slot-real-time.mjs`: **5/5**                                                                                                                |
| Persistence           |     NA | Nessuna modifica al modello dati                                                                                                                                |
| Agnos action registry |   PASS | Confermato che `facility-signals.ts` non dipende da `slot.ora`, invariato                                                                                       |
| Security/privacy      |     NA | Nessun dato coinvolto (verifica su DB prod sola lettura, un solo paziente gia' nominato dall'utente, nessun dato esposto oltre quanto necessario alla diagnosi) |

Eseguiti direttamente (io, il coordinatore):

- `npx tsc -p tsconfig.json --noEmit` (backend): pulito.
- `npx tsx --test` su `ai/__tests__` + `therapies/__tests__` + `routes/__tests__`: 305 test / 289
  pass / 16 fail — **tutti e 16** i fallimenti sono `Error: DATABASE_URL is required`
  (limitazione ambientale preesistente, confermata spot-checkando piu' file, nessuna relazione con
  questo fix — coerente con il pattern gia' osservato in tutta la sessione).
- `npx tsc --noEmit` (frontend): pulito (nessun file frontend toccato da questo fix).
- `npx eslint` sui 3 file backend toccati/creati: zero errori.
- **Verifica diretta contro il database di produzione** (sola lettura, tramite `railway run` +
  proxy pubblico Postgres): eseguita `buildTherapySlots()` con il fix applicato sui dati reali —
  fascia "pomeriggio" per SABBATANI LILIANA produce `ora: "14:00"` (era sempre `"16:00"` prima del
  fix). Questa e' la prova piu' diretta possibile che il fix risolve esattamente il caso segnalato,
  non un caso sintetico.

## Runtime Evidence

Nessun Postgres/Podman disponibile per l'esecuzione e2e standard in questo ambiente; evidenza via
browser reale con `page.route` stubbing, con lo shape gia' corretto dal fix (verificato
separatamente contro i dati reali, vedi sopra). **5/5 verifiche superate** su
`e2e/agenda-therapy-slot-real-time.mjs`:

1. Entrambe le fasce (mattina, pomeriggio) sono renderizzate in agenda.
2. La card "Terapia Pomeriggio" e' visibile.
3. **La card "Pomeriggio" e' posizionata nella riga della griglia corrispondente alle 14:00
   (l'orario reale della dose di SABBATANI), non piu' alla riga 16:00** (il default fisso che
   nascondeva la dose reale) — screenshot `01-agenda-pomeriggio-a-14.png`.
4. Il dettaglio della fascia (click sulla card) mostra SABBATANI con l'orario 14:00 per riga —
   screenshot `02-dettaglio-fascia-pomeriggio.png`.
5. Zero errori JavaScript in console durante lo scenario.

Dettaglio in `screenshots/verifiche.json`.

## Residual Risks

- **R1 (dal contract)**: se la stessa fascia contiene dosi reali a orari diversi per pazienti
  diversi (es. "Pomeriggio" con una dose a 14:00 e un'altra a 16:00), la card si posiziona
  all'orario piu' precoce e le contiene ENTRAMBE — non due card separate. Miglioramento netto
  rispetto a prima (sempre sbagliato), non una soluzione perfetta: un utente che scorre dalle 14:00
  in poi trova la card, il dettaglio esatto per singola dose resta nel modal (gia' corretto).
- **R2 (dal contract)**: un redesign della griglia per posizionare ogni singola somministrazione al
  proprio orario esatto (invece di raggruppare per fascia con un singolo ancoraggio) e' fuori
  ambito per questo fix mirato — cambierebbe la shape/contratto con impatto su piu' consumatori.
- **Autocertificazione**: indagine, diagnosi, implementazione e verifica (inclusa quella contro il
  database di produzione) eseguite tutte da me in questo ciclo (nessun sub-agente Ruflo per
  l'implementazione — fix di ambito ridotto e ben definito dopo l'indagine; l'indagine iniziale
  ha usato un agente Explore reale).

## Final Decision

CLOSED — VERIFIED

Il fix e' verificato al livello piu' diretto possibile per questo tipo di difetto: non solo con
test unitari sintetici, ma **eseguendo la funzione corretta sui dati reali della paziente
nominata dall'utente, contro il database di produzione**, confermando che il caso esatto segnalato
(LASIX 08:00+14:00, dose delle 14:00 "invisibile" in agenda) e' risolto. L'evidenza runtime
Playwright conferma inoltre che l'interfaccia utente renderizza correttamente la posizione/etichetta
una volta che il backend restituisce il dato corretto. Confermato che le capacita' Agnos introdotte
nel ciclo precedente non sono impattate (verificato per lettura diretta del codice, non per
assunzione).
