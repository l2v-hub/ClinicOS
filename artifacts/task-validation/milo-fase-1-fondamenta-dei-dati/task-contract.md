# Task Contract

## Task

- Title: Milo fase 1 fondamenta dei dati
- Slug: milo-fase-1-fondamenta-dei-dati
- Type: change
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

Note: richiesta dell'utente (2026-11-22): «parti con la Fase 1» del piano
`docs/architecture/milo-ai-first.md` (§4, Fase 1). Solo letture: nessuna scrittura nuova, nessuna
modifica a Prisma o alle rotte esistenti. Il servizio AI riceve l'elenco aggiornato di intenti e
strumenti.

## Current Behaviour

Milo legge i parametri solo dal JSON della cartella (non dalla tabella della pagina Parametri), non
legge diario, scale, somministrazioni né turni; NEWS2 esiste solo nel frontend; `query_data` sul
paziente corrente restituisce vuoto; il pianificatore LLM scarta tre intenti validi.

## Expected Behaviour

Nuovi strumenti di sola lettura nel gateway, ognuno con fonti verificabili, perimetro del paziente
e audit: parametri unificati con serie e aggregati per giorno, NEWS2 calcolato nel backend, diario,
scale e valutazioni finalizzate, somministrazioni, turni del personale, appuntamenti su un periodo.
Pianificatore deterministico e LLM li riconoscono; difetti corretti.

## Acceptance Criteria

- AC1: un valore registrato dalla pagina Parametri (`PatientParameterReading`) è restituito dalle
  letture dei parametri di Milo insieme a quelli del JSON storico.
- AC2: NEWS2 del backend coincide con quello del frontend su tutti i casi di prova (stesso
  insieme di casi eseguito su entrambe le implementazioni).
- AC3: «chi è di turno domani», «visite di domani», «diario di …», «scale di …»,
  «somministrazioni di …», «NEWS2 di …» producono il piano con lo strumento giusto.
- AC4: `query_data` con `patient: "current"` restituisce righe; gli intenti `vitals_trend`,
  `facility_snapshot`, `operator_queue` e i nuovi sono accettati dal pianificatore LLM;
  `query_rooms_occupancy` è offerto al modello.
- AC5: ogni nuovo strumento applica perimetro del paziente (o il gate di struttura) e restituisce
  fonti; i turni non contengono dati clinici; gli appuntamenti non contengono motivo né note.
- AC6: suite backend senza fallimenti nuovi, suite del servizio AI, build.

## Test Plan

| Test type                 | Required | Reason                                         |
| ------------------------- | -------: | ---------------------------------------------- |
| Unit                      |      yes | NEWS2 parità, piani, aggregati, date           |
| Integration               |      yes | letture reali su PostgreSQL con dati sintetici |
| API                       |      yes | `/ai/assistant/query` locale                   |
| Playwright                |       no | nessuna interfaccia nuova in questa fase       |
| Persistence after refresh |       no | sola lettura                                   |
| Agnos action registry     |      yes | intenti e strumenti del pianificatore          |
| Voice simulation          |       no |                                                |
| OCR/import test           |       no |                                                |
| Security/privacy scan     |      yes | perimetro, campi esclusi                       |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/` suite, risposte di `/ai/assistant/query` locali alle domande dei criteri

## Risks

- Le etichette del JSON storico dei parametri non sono uniformi: la mappatura copre quelle note.
- Il pianificatore deterministico resta a regole: copre le formulazioni comuni, il resto passa
  dal pianificatore LLM (Fase 2 lo sostituisce con il team di agenti).

## Gate Status

READY FOR IMPLEMENTATION
