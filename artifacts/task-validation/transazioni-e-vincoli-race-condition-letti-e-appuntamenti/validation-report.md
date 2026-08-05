# Task Validation Report

## Task
- Title: Transazioni e vincoli race condition letti e appuntamenti
- Slug: transazioni-e-vincoli-race-condition-letti-e-appuntamenti
- Commit: (uncommitted at validation time)
- Date: 2026-08-05 (rivalidato con Postgres reale — vedi sotto; bug di concorrenza trovato e corretto)

## Implementation Summary

Assegnazione letto (`admin-rooms.ts`) e creazione/modifica appuntamento
(`appointment-service.ts`): controllo conflitto + scrittura ora dentro `prisma.$transaction`, con
`pg_advisory_xact_lock(hashtext(chiave))` come primo passo (bedId per i letti; operatorId+slot per
gli appuntamenti). `ensureOperator` (upsert idempotente User/Operator) lasciata deliberatamente
fuori dalla transazione di lock — deve commitare anche se il conflitto rifiuta la richiesta, e
tenerla fuori minimizza il tempo di contesa del lock.

**Bug trovato durante la rivalidazione con Postgres reale (2026-08-05) e corretto**: proprio perche'
`ensureOperator` e' fuori dal lock, due richieste concorrenti per lo stesso `operatorId` mai visto
prima potevano eseguire `prisma.user.upsert`/`prisma.operator.upsert` in parallelo; il secondo
upsert falliva con `PrismaClientKnownRequestError P2002` (unique constraint su `email`/`id`) invece
di aggiornare, facendo fallire l'intera richiesta invece di limitarsi a perdere la gara sullo slot.
Aggiunta una `isUniqueConstraintError` che, su P2002, ripiega su una rilettura (`findUniqueOrThrow`)
invece di propagare l'errore — vedi `ensureOperator` in `appointment-service.ts`. Trovato solo
eseguendo il test di concorrenza contro un Postgres reale: con placeholder/DB irraggiungibile la
race non si manifesta mai.

## Files Changed

`backend/src/routes/admin-rooms.ts`, `backend/src/services/appointment-service.ts` (+ fix
`ensureOperator`, vedi sopra); nuovi test
`backend/src/services/__tests__/appointment-service-concurrency.test.ts`,
`backend/src/routes/__tests__/admin-rooms-concurrency.test.ts`.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 (transazione+lock assegnazione letto) | PASS | Verificato per ispezione **e** a runtime contro Postgres reale (vedi AC5). |
| AC2 (transazione+lock appuntamenti) | PASS | Idem, incluso il caso updateAppointment (lock sullo slot di destinazione, solo se slotChanged); a runtime ha anche rivelato e permesso di correggere il bug di `ensureOperator` sopra descritto. |
| AC3 (comportamento non concorrente invariato) | PASS | Nessuna modifica alla logica di business/status code/messaggi; confermato dal passaggio degli altri 433 test della suite (nessuna regressione) eseguiti sullo stesso Postgres reale. |
| AC4 (tsc pulito) | PASS | `npx tsc --noEmit` → 0 errori (anche dopo il fix a `ensureOperator`). |
| AC5 (test di concorrenza, best-effort) | PASS | Rieseguiti contro Postgres reale (Railway, database usa-e-getta dedicato): `admin-rooms-concurrency.test.ts` conferma due assegnazioni letto concorrenti sullo stesso bed/periodo → una sola 201, l'altra 409. `appointment-service-concurrency.test.ts`: prima esecuzione ha fatto fallire il test "due createAppointment concorrenti" per il bug di `ensureOperator` (non un problema del lock: l'errore avveniva PRIMA della sezione con lock); dopo il fix, entrambi i test di concorrenza (create e update) passano — una sola richiesta vince, l'altra riceve `SlotConflictError`. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Integration | PASS | Suite backend completa rieseguita contro Postgres reale: 435/435 verdi (1 fallimento iniziale nel test di concorrenza appuntamenti, causato dal bug `ensureOperator` sopra, risolto e riverificato verde). |

## Runtime Evidence

Rivalidato il 2026-08-05 contro un Postgres reale: servizio Postgres Railway dedicato e usa-e-getta
(progetto `glistening-friendship`, NON il Postgres di produzione), esposto via
`railway connect --tunnel-only`, migrato con `prisma migrate deploy` (26/26 OK), poi
`DATABASE_URL=<tunnel> npm test` da `backend/`. Log applicativo sanitizzato osservato durante il
test di concorrenza sui letti: `POST /patients/<id>/room-assignments → created id=<cuid>` (solo id,
nessun dato clinico). Prova empirica della serializzazione del lock advisory: su richieste
concorrenti reali, esattamente una vince (201/successo) e l'altra riceve il conflitto atteso
(409/`SlotConflictError`), mai entrambe o nessuna. Servizio Postgres di test riutilizzato per gli
altri task in sospeso nella stessa sessione; tenuto attivo su decisione dell'utente per eventuale
riuso futuro (solo dati sintetici di test, nessun dato reale).

## Residual Risks

- `ensureOperator` fuori transazione: scelta corretta dal punto di vista della UX (l'operatore va
  comunque creato anche se lo slot e' occupato) ma significa che un provisioning "sprecato" puo'
  avvenire anche per richieste che poi falliscono per conflitto — impatto trascurabile data
  l'idempotenza dell'upsert (ora davvero idempotente anche sotto race, dopo il fix P2002).
- Il test di concorrenza usa due chiamate quasi-simultanee lato Node, non un carico realistico
  multi-processo/multi-istanza; sufficiente per dimostrare la correttezza del lock advisory a
  livello di singola istanza backend.

## Final Decision

CLOSED — VERIFIED
