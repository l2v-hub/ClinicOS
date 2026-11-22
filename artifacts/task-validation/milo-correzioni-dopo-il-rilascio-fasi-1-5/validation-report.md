# Task Validation Report

## Task

- Title: Milo correzioni dopo il rilascio fasi 1-5
- Slug: milo-correzioni-dopo-il-rilascio-fasi-1-5
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (commit «Milo: correzioni dopo il rilascio»)
- Date: 2026-11-22

## Implementation Summary

- `llm-planner.ts`: quando il pianificatore deterministico riconosce un intento preciso
  (turni, agenda, parametri, NEWS2, diario, scale, somministrazioni) e il piano del modello è
  diverso, si usa il deterministico.
- `gateway/query/engine.ts`: i valori dei filtri sui campi data diventano istanti
  (`coerceDateValue`):
  - senza fuso = ora di Roma;
  - solo data = mezzanotte di Roma;
  - data o ora impossibile = `bad_request`, che `dispatchQueryData` trasforma in risultato vuoto.
- `service.ts`: un `bad_request` di qualunque lettura dà «non trovato», non 500.

## Files Changed

`backend/src/ai/assistant/llm-planner.ts`, `backend/src/ai/gateway/query/engine.ts`,
`backend/src/ai/assistant/service.ts`, test `backend/src/ai/__tests__/milo-post-release-fixes.test.ts`,
`tests/integration/milo-phase1-reads.test.mts` (caso `query_data` sull'agenda).

## Acceptance Criteria Result

| AC  |  Result | Evidence                                                                                                                                                                                                                                |
| --- | ------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |    PASS | `logs/unit-fixes.log`: piano LLM di panoramica → turni con la data di domani; `query_data` → `query_agenda`; allergie restano al modello                                                                                                |
| AC2 |    PASS | `logs/integration-query-data.log`: `scheduledAt lt "<data>T00:00:00"` trova l'appuntamento su PGlite; «dopodomani» → risposta vuota. Senza la correzione lo stesso test fallisce con l'errore della demo («Expected ISO-8601 DateTime») |
| AC3 |    PASS | `logs/backend-suite-summary.log`: 150 file in errore come la baseline, 0 nuovi; typecheck                                                                                                                                               |
| AC4 | NOT RUN | dopo il rilascio del backend: le due domande sulla demo                                                                                                                                                                                 |

## Test Results

| Test             |  Result | Evidence                                                                  |
| ---------------- | ------: | ------------------------------------------------------------------------- |
| Unit             |    PASS | `logs/unit-fixes.log` (17/17, con i test esistenti del pianificatore LLM) |
| Integration      |    PASS | `logs/integration-query-data.log` (8/8)                                   |
| API              | NOT RUN | dopo il rilascio                                                          |
| Playwright       | NOT RUN | dopo il rilascio                                                          |
| Persistence      |      NA |                                                                           |
| Agnos AI         |    PASS | pianificatore                                                             |
| Voice            |      NA |                                                                           |
| OCR              |      NA |                                                                           |
| Security/privacy |      NA | nessun nuovo accesso                                                      |

## Runtime Evidence

Errore osservato sulla demo prima della correzione: `query_data` con
`scheduledAt: { lt: "2026-11-23T00:00:00" }`, Prisma «Invalid value», risposta 500.

## Logs

`logs/unit-fixes.log`, `logs/integration-query-data.log`, `logs/backend-suite-summary.log`.

## Residual Risks

- Il pianificatore LLM resta attivo per le domande non riconosciute con certezza.

## Final Decision

IMPLEMENTED — NOT VERIFIED
