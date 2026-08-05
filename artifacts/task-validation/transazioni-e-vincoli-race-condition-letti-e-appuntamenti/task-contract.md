# Task Contract

## Task
- Title: Transazioni e vincoli race condition letti e appuntamenti
- Slug: transazioni-e-vincoli-race-condition-letti-e-appuntamenti
- Type: bugfix
- Date: 2026-07-31

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

`backend/src/routes/admin-rooms.ts` (assegnazione letto, ~riga 540-600): controllo overlap
(`findMany` + filtro JS `rangesOverlap`), chiusura dell'assegnazione attiva del paziente
(`update`), creazione della nuova assegnazione (`create`) sono TRE operazioni separate, nessuna
in transazione. Due richieste concorrenti sullo stesso letto possono superare entrambe il
controllo overlap prima che una delle due committi, causando doppia occupazione.

`backend/src/services/appointment-service.ts` (`createAppointment`/`updateAppointment`,
righe 222-285): stesso pattern — `findConflict` (query) e `create`/`update` sono chiamate
separate, senza lock. Due richieste concorrenti sullo stesso operatore+orario possono entrambe
superare il check.

## Expected Behaviour

Entrambi i flussi acquisiscono un lock a livello di transazione DB (Postgres advisory lock,
`pg_advisory_xact_lock`, sull'identificatore rilevante: bedId per le assegnazioni, operatorId+slot
per gli appuntamenti) PRIMA del controllo di conflitto, dentro un `prisma.$transaction`. Cosi' due
richieste concorrenti si serializzano: la seconda vede gia' l'effetto della prima e viene
correttamente rifiutata con 409, invece di poter passare entrambe il check. Nessuna migrazione di
schema richiesta (l'advisory lock non e' persistito, e' a livello di sessione/transazione).

## Acceptance Criteria

- AC1: L'intera sequenza "controllo overlap letto -> chiusura assegnazione attiva -> creazione
  nuova assegnazione" avviene dentro un unico `prisma.$transaction`, con un
  `pg_advisory_xact_lock(hashtext(bedId))` (o equivalente) acquisito come prima operazione della
  transazione.
- AC2: L'intera sequenza "controllo conflitto -> create/update appuntamento" avviene dentro un
  unico `prisma.$transaction`, con un lock analogo sulla chiave operatorId (+ data/ora per
  createAppointment; operatorId+slot risultante per updateAppointment).
- AC3: Il comportamento funzionale osservabile per un singolo chiamante (senza concorrenza) resta
  identico a oggi: stessi codici di stato, stessi messaggi di errore, nessuna regressione.
- AC4: `cd backend && npx tsc --noEmit` pulito.
- AC5 (best-effort, dipendente da DB reale): un test che lancia due richieste concorrenti sullo
  stesso letto (o stesso slot operatore) verifica che una sola vada a buon fine e l'altra riceva
  409 — scritto e pronto, ma eseguibile solo con Postgres realmente raggiungibile (vedi Risks).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | yes | Test di concorrenza (due richieste in parallelo) su assegnazione letto e su creazione appuntamento; verifica anche il caso non concorrente (comportamento invariato). |
| API | no | Coperto dal test di integrazione. |
| Playwright | no | Nessun impatto UI diretto. |
| Persistence after refresh | no | |
| Agnos action registry | no | Il flusso Agnos usa `createAppointment`/`updateAppointment`, quindi eredita la protezione senza modifiche proprie — da verificare non regredisca (test esistenti su appointment-service). |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output tsc --noEmit
- output test di integrazione (concorrenza) — con nota esplicita se non eseguibile per assenza DB

## Risks

- **Verifica di concorrenza reale non eseguibile in questa sessione**: senza Postgres raggiungibile
  non posso dimostrare empiricamente che il lock serializzi davvero le richieste concorrenti (il
  codice puo' essere corretto per ispezione ma la prova richiede un DB reale con due connessioni
  simultanee). Da eseguire nella validazione runtime cumulativa di fine piano.
- **Deadlock/lock hold time**: l'advisory lock resta acquisito per tutta la durata della
  transazione; se la transazione include operazioni lente, aumenta la contesa. Mitigazione:
  transazioni brevi, solo le query strettamente necessarie al controllo+scrittura.
- **Compatibilita' con `ensureOperator`** (chiamata prima di `createAppointment`'s conflict check):
  verificare che non introduca una seconda transazione annidata in conflitto con quella nuova.

## Gate Status

READY FOR IMPLEMENTATION
