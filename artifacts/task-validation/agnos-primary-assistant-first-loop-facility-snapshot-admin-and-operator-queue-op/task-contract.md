# Task Contract

## Task

- Title: Agnos primary assistant - First loop: facility snapshot (Admin) and operator queue (Operator)
- Slug: agnos-primary-assistant-first-loop-facility-snapshot-admin-and-operator-queue-op
- Type: feature (Agnos AI assistant, backend read-only additions + frontend integration)
- Date: 2026-08-08

## Impact Classification

| Area                 |                                                                      Impacted |
| -------------------- | ----------------------------------------------------------------------------: |
| Frontend/UI          |                                                                           yes |
| Backend/API          |                   yes (additive read-only endpoints/tools, no contract break) |
| Database/Persistence |                                                                            no |
| Agnos AI / Chatbot   |                                                                           yes |
| Voice                |                                                                            no |
| OCR / Import         |                                                                            no |
| Auth / Permissions   | no (reuses existing facility-read gating, no change to role/permission model) |
| Privacy / Security   |                                                                            no |
| Config / Env         |                                                                            no |

## Contesto

Direttiva utente: evolvere Agnos da chatbot a livello di intelligenza/navigazione primario di
ClinicOS, in modalita' Ruflo Swarm / Loop Engineering completa. Fase DISCOVER completata con 4
agenti Ruflo reali (ricerca via Task tool, risultati riportati in Ruflo via
`agent_update`/`memory_store`) + verifica diretta del coordinatore su `plan.ts`:

- Agnos e' MOLTO piu' costruito di quanto i doc facciano pensare: pipeline
  plan→validate→dispatch→compose gia' esistente, motore di query componibile (`query_data` DSL)
  gia' testato, anti-hallucination check sulle citazioni gia' presente, `NavAction` gia'
  restituito dal backend con navigazione strutturata.
- **Confermato leggendo `plan.ts` direttamente**: "Quanti posti letto sono occupati?"/"Quali posti
  sono liberi?" e la lista dello staff **funzionano gia' oggi** (intent `rooms_occupancy` riga
  223-229, `staff_list` riga 197-204). Non li reimplementiamo.
- **Gap reali confermati** (nessun intent esiste per): terapie in ritardo (facility-wide), consegne/
  attivita' (l'intera entita' non fa parte della pipeline di lettura Agnos oggi), turni/personale in
  servizio ora (il JSON `turni` non viene mai interpretato server-side), una "istantanea" composta
  della struttura, una coda "cosa devo fare ora" per operatore.
- **Vincolo di sicurezza da rispettare, non modificare**: la rotta pubblica pinna sempre il ruolo a
  `operatore` (decisione di sicurezza deliberata, in attesa di IdP reale) — le nuove capacita' di
  questo ciclo devono restare letture "facility" (role-independent, gated da env flag), MAI letture
  cross-paziente privilegiate, per non toccare il modello di permessi.
- **Gap strutturale**: non esiste alcun modello di assegnazione paziente↔operatore — non e'
  possibile uno scoping "solo i miei pazienti" veramente affidabile lato server oggi. Questo ciclo
  NON introduce un cambio di schema per risolverlo (fuori dai limiti di autonomia dichiarati
  dall'utente) — la coda operatore usa una priorita' morbida (nome libero in `operatoreAssegnato`),
  etichettata onestamente come "la giornata di oggi", non "i tuoi pazienti esclusivi".

## Expected Behaviour

**Admin** chiede "Cosa sta succedendo nella mia struttura in questo momento?" → Agnos risponde con
occupazione, terapie in ritardo, consegne scadute, appuntamenti di oggi in UNA risposta sintetica
(pattern RISPOSTA → ECCEZIONE → AZIONE), con azioni cliccabili verso le schermate pertinenti.

**Operatore** chiede "Cosa devo fare adesso?" → Agnos risponde con le terapie dovute a breve/in
ritardo e le consegne aperte per oggi, con le proprie (nome-match) evidenziate per prime, azioni
cliccabili verso le schermate pertinenti.

Entrambe le esperienze sono disponibili anche SENZA che l'utente scriva nulla: aprendo il pannello
Agnos, un "brief" iniziale viene recuperato automaticamente (sforzo utente minimo, come richiesto
dal criterio di successo della direttiva).

## Acceptance Criteria

- AC1 — nuovo tool di lettura `get_facility_snapshot`: aggrega occupazione (riusa la logica
  esistente di `roomsOccupancy()`), conteggio terapie in ritardo (nuovo, calcolo server-side che
  rispecchia la logica gia' usata client-side in `useRiepilogoSomministrazioni.ts`, stessa fonte
  dati `GET /therapy-slots`), conteggio consegne scadute (nuovo, prima volta calcolato
  server-side), conteggio appuntamenti di oggi (riusa `query_appointments_today`). Lettura
  role-independent (facility), MAI cross-paziente.
- AC2 — nuovo tool di lettura `get_operator_queue`: terapie dovute a breve/in ritardo (finestra
  temporale, non l'intera giornata) + consegne aperte, con priorita' morbida per nome-match
  sull'operatore chiamante. Nessun filtro rigido "solo miei pazienti" (il gap strutturale resta
  esplicito, non nascosto).
- AC3 — entrambi i tool aggiunti a `READ_TOOLS`/`READ_TOOL_SCHEMA` e nuovi intent nel planner
  deterministico (`plan.ts`), con test unitari (pattern esistente in `backend/src/ai/__tests__/`).
- AC4 — frontend: `navKey` (contesto di rotta) inviato in aggiunta a `currentPatientId` nella
  richiesta plan/execute (campo additivo, nessuna rottura di contratto).
- AC5 — `App.tsx`'s `onNavigate` usa la forma COMPLETA di `NavAction` gia' restituita dal backend
  (`sectionKey`/`recordId`/`documentId`/`pageNumber`, oggi scartati — solo `patientId` e' letto),
  riusando il parametro `moduleTabId` gia' supportato da `selectPaziente`; aggiunta gestione per
  target di navigazione non-paziente (consegne, agenda).
- AC6 — `AgnosPanel` resta montato-ma-nascosto invece di smontarsi completamente alla chiusura
  (continuita' di stato attraverso la navigazione).
- AC7 — all'apertura del pannello senza messaggi precedenti, viene recuperato automaticamente un
  "brief" (facility snapshot per admin, operator queue per operatore).
- AC8 — `npx tsc --noEmit`, `npm run build`, `npm test` (frontend) e la suite `backend/src/ai/
__tests__/` invariati/verdi.
- AC9 — QA dedicato hallucination/permission: nessuna invenzione di dati quando una query restituisce
  vuoto; i nuovi tool restano letture facility role-independent, mai cross-paziente; disciplina di
  citazione/grounding mantenuta.

### Aperti — verificati a runtime nel validation-report

- AC-R1: la domanda admin "cosa sta succedendo" produce una risposta reale con dati reali (mock) e
  azioni di navigazione cliccabili.
- AC-R2: la domanda operatore "cosa devo fare adesso" produce una risposta reale con dati reali
  (mock) e azioni di navigazione cliccabili.
- AC-R3: il brief automatico appare all'apertura del pannello senza input dell'utente.
- AC-R4: cliccare un'azione di navigazione porta davvero alla schermata/sezione corretta.
- AC-R5: zero errori console durante lo scenario.

## Test Plan

| Test type                 | Required | Reason                                                                              |
| ------------------------- | -------: | ----------------------------------------------------------------------------------- |
| Unit                      |      yes | nuovi tool/intent backend, pattern esistente in `backend/src/ai/__tests__/`         |
| Integration               |       no | nessuna nuova integrazione esterna                                                  |
| API                       |      yes | nuovi tool testati contro il gateway esistente                                      |
| Playwright                |      yes | comportamento runtime UI (brief automatico, navigazione, risposta)                  |
| Persistence after refresh |       no | nessuna modifica al modello dati                                                    |
| Agnos action registry     |      yes | i nuovi tool devono comparire nel catalogo/allowlist, mai eseguibili come scrittura |
| Security/privacy          |      yes | QA dedicato hallucination/permission (AC9)                                          |

## Risks

**R1 — Scoping "cosa devo fare" resta approssimativo per design, non per bug.** Nessun modello di
assegnazione paziente↔operatore esiste; la coda usa priorita' morbida su nome libero, non un filtro
affidabile. Rischio residuo consapevole, comunicato onestamente nella UI ("la giornata di oggi", non
"i tuoi pazienti"), non un difetto di questo ciclo. Un vero scoping richiede una decisione di schema
futura, esplicitamente fuori da questo ciclo.

**R2 — Turni/personale in servizio ora deliberatamente NON incluso in questo ciclo.** Il JSON
`OperatorSchedule.turni` e' opaco e "di proprieta' dell'editor frontend" — interpretarlo male
produrrebbe un'invenzione di dati (violazione diretta del principio di grounding), peggiore che non
rispondere. Rinviato al prossimo loop con una decisione di design dedicata.

**R3 — Vincolo di sicurezza rispettato, non toccato.** Le nuove capacita' restano letture facility
role-independent (stesso meccanismo di `canFacilityRead`/`rooms_occupancy` gia' in produzione), MAI
letture cross-paziente privilegiate — nessuna modifica al pinning del ruolo sulla rotta pubblica.

## Gate Status

READY FOR IMPLEMENTATION
