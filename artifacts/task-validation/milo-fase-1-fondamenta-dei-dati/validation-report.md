# Task Validation Report

## Task

- Title: Milo fase 1 fondamenta dei dati
- Slug: milo-fase-1-fondamenta-dei-dati
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (commit «Milo fasi 1–3»)
- Date: 2026-11-22

## Implementation Summary

Letture nuove di Milo, tutte nel gateway del backend con perimetro e fonti:

- i parametri della pagina Parametri insieme a quelli storici della cartella (`clinical-reads.ts`, `clinical-series.ts`);
- NEWS2 calcolato nel backend, copia esatta di quello del frontend, con la fonte del protocollo (`clinical/scores/news2.ts`);
- diario, scale finalizzate, somministrazioni;
- turni del personale (solo campi organizzativi) e agenda (senza motivo né note).

Il pianificatore deterministico e quello LLM riconoscono gli intenti nuovi. Corretti due difetti:

- `query_data` non riceveva il paziente corrente;
- quattro intenti non erano accettati dal pianificatore LLM.

Registro dei permessi aggiornato: ogni `ai.read.*` nuovo è governato dalla capacità funzionale
corrispondente.

## Files Changed

`backend/src/ai/gateway/{clinical-reads,clinical-series,types,sources}.ts`,
`backend/src/clinical/scores/news2.ts` (+ test di parità),
`backend/src/ai/assistant/{plan,llm-planner,read-tools,agents,nav,service}.ts`, registro dei
permessi (`.ai-architecture/…`, `backend/src/authz/capability-registry.json`,
`scripts/ai-architecture/build-authz-registry.mjs`), frontend
`agnos/{agnosActionNavigation,agnosNav}.ts`, runtime `agents/assistant.py`; test nuovi in
`backend/src/ai/__tests__/milo-phase1-reads.test.ts`, `tests/integration/milo-phase1-reads.test.mts`,
`frontend/src/components/shared/agnos/staffScheduleNav.test.ts`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                  |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `logs/integration-milo-phase1.log`: rilevazione della pagina Parametri e PA storica della cartella restituite insieme                                     |
| AC2 |   PASS | `news2-parity.test.ts`: 69 casi, stesso risultato di `frontend/src/lib/news2.ts` (`logs/unit-milo-phase1.log`)                                            |
| AC3 |   PASS | `logs/unit-milo-phase1.log`: piani delle domande dei criteri (turni, visite, diario, scale, somministrazioni, NEWS2)                                      |
| AC4 |   PASS | integrazione: `query_data` con `patient:"current"` restituisce righe; unit: intenti accettati dal pianificatore LLM, `query_rooms_occupancy` nello schema |
| AC5 |   PASS | integrazione: paziente fuori perimetro rifiutato, turni senza campi clinici, agenda senza motivo/note, gate di struttura                                  |
| AC6 |   PASS | `logs/backend-suite-summary.log` (stessi 150 file in errore della baseline, 0 nuovi), runtime 249 OK, build frontend                                      |

## Test Results

| Test             | Result | Evidence                                                                               |
| ---------------- | -----: | -------------------------------------------------------------------------------------- |
| Unit             |   PASS | `logs/unit-milo-phase1.log` (9/9) + parità NEWS2                                       |
| Integration      |   PASS | `logs/integration-milo-phase1.log` (7/7, PGlite con tutte le migrazioni)               |
| API              |   PASS | `assistantQuery` (il servizio dietro `/ai/assistant/query`) esercitato in integrazione |
| Playwright       |     NA | nessuna interfaccia nuova in questa fase (contratto)                                   |
| Persistence      |     NA | sola lettura                                                                           |
| Agnos AI         |   PASS | intenti e strumenti dei pianificatori allineati (unit)                                 |
| Voice            |     NA |                                                                                        |
| OCR              |     NA |                                                                                        |
| Security/privacy |   PASS | perimetro e campi esclusi verificati in integrazione                                   |

## Runtime Evidence

Esecuzione locale su PGlite (tutte le migrazioni Prisma) con dati sintetici del test; nessun dato
reale.

## Logs

`logs/unit-milo-phase1.log`, `logs/integration-milo-phase1.log`, `logs/backend-typecheck.log`,
`logs/backend-suite-summary.log`, `logs/frontend-tests.log`, `logs/frontend-build.log`,
`logs/runtime-tests.log`.

## Residual Risks

- Etichette del JSON storico dei parametri non uniformi: la mappatura copre quelle note.
- Le letture nuove saranno usate in esercizio solo dopo il rilascio (non ancora fatto).

## Final Decision

CLOSED — VERIFIED
