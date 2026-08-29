# Task Contract

## Task

- Title: Quality loop 3 dashboard overview and patient contracts
- Slug: quality-loop-3-dashboard-overview-patient-contracts
- Type: refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Al login il frontend richiede tutti i pazienti e tutti i riepiloghi clinici. Il riepilogo carica
ogni blob `Cartella.data`, lo materializza in Node e restituisce una voce per paziente anche quando
la dashboard usa soltanto sette contatori. `/patients` ha paginazione offset opt-in, nessun contratto
stabile di pagina e nessuna ricerca server-side.

## Expected Behaviour

Le dashboard devono usare un endpoint overview con risposta di dimensione costante e totale pazienti
server-side. Deve esistere un contratto keyset paginato per il successivo rollout della lista, con
limite massimo e cursor legato ai filtri. Il riepilogo dettagliato deve poter essere ristretto a un
massimo di 100 patientId. Le API legacy restano temporaneamente compatibili per non nascondere
pazienti ad agenda, ricerca, Agnos o parametri multipaziente.

## Acceptance Criteria

- AC1: `GET /patients/page` restituisce massimo 100 elementi, ordinamento stabile
  `(lastName, firstName, id)`, `hasMore` e cursor keyset opaco.
- AC2: cursor malformato, troppo lungo o creato con filtri differenti restituisce 400; `q` e `sex`
  sono validati e il limite e' clampato 1-100.
- AC3: `GET /patients/clinical-summary?patientIds=...` accetta massimo 100 ID unici e non legge
  cartelle fuori dal batch; piu' di 100 o ID non validi restituiscono 400.
- AC4: `GET /patients/clinical-summary/overview` restituisce un solo oggetto con totale pazienti,
  criticita', rischi, ricoverati/dimessi, allergie e conteggi terapia; nessun contenuto clinico.
- AC5: dashboard admin e operatore usano l'overview e il totale server-side; il riepilogo completo
  non parte piu' al login ed e' caricato soltanto quando si apre la lista pazienti legacy.
- AC6: build, test frontend, test parser/cursor, auth/security e secret scan restano verdi.
- AC7: le nuove route restano dietro `requireOperator`; nessuna ricerca amplia il perimetro oggi
  autorizzato e i limiti vengono applicati prima delle query.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Parser query e codec cursor |
| Integration | yes | Route summary/overview e pagina |
| API | yes | Input invalidi, limiti e auth |
| Playwright | no | Nessuna nuova interazione visuale |
| Persistence after refresh | no | Sola lettura |
| Agnos action registry | no | Invariato |
| Voice simulation | no | Invariato |
| OCR/import test | no | Invariato |
| Security/privacy scan | yes | Query su PHI e anti-enumerazione |

## Evidence Plan

- validation-report.md
- test output
- API test output
- build output
- secret scan

## Risks

- L'overview aggrega JSON nel database ma resta una scansione O(N); la materializzazione
  transazionale e' un ciclo successivo che richiede PostgreSQL di test e backfill verificato.
- Il roster legacy resta caricato per consumer non ancora migrati. Troncarlo ora nasconderebbe
  pazienti e sarebbe un rischio clinico maggiore del debito prestazionale.
- La ricerca `contains` non e' ancora indicizzata con trigram; il benchmark determinera' se usare
  prefix search o `pg_trgm`.
- Il cursor e' validato e legato ai filtri ma non e' un token di autorizzazione; l'accesso continua
  a dipendere esclusivamente dalla policy server-side.

## Gate Status

READY FOR IMPLEMENTATION
