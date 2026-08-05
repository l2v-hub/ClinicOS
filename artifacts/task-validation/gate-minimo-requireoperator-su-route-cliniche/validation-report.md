# Task Validation Report

## Task
- Title: Gate minimo requireOperator su route cliniche
- Slug: gate-minimo-requireoperator-su-route-cliniche
- Commit: (uncommitted at validation time)
- Date: 2026-08-05 (rivalidato con Postgres reale + smoke Playwright — vedi sotto)

## Implementation Summary

Applicato `requireOperator` (backend/src/ai/auth.ts, gate header-based) a tutti i router che
toccano dati paziente e non erano gia' protetti: patients, admin-rooms (rooms/beds +
patient-assignment), appointments, therapy, consegne, note, operators, patient-therapies,
patient-diary, patient-intake, narrative-sections. Individuato e corretto un bug di ordine di
mount in app.ts: `patientDocumentsRouter` (gia' protetto dal proprio gate demo/Entra) doveva
restare il primo router montato sotto `/patients`, altrimenti un `router.use(requireOperator)`
di un router successivo avrebbe intercettato anche le sue richieste Bearer/Entra prima che
raggiungessero il gate corretto — riprodotto con una simulazione Express minimale prima del fix.

Lato frontend, creato `frontend/src/lib/operatorSession.ts` (singleton `getCurrentOperator`/
`setCurrentOperator`, valorizzato al login/logout in App.tsx) e aggiornato `cachedGetJson` per
allegare automaticamente gli header. Ogni fetch diretta verso le route ora protette (App.tsx,
TerapiaFarmacologicaTab.tsx, DischargeLetterImport.tsx, DiarioPazienteTab.tsx,
NarrativeSectionsTab.tsx, RoomsManagement.tsx) e' stata aggiornata per allegare
`X-Operator-Id`/`X-Operator-Role`. Cross-check manuale (grep indipendente) tra l'elenco di route
gatate riportato dall'agente backend e le chiamate frontend coperte: nessuna route gatata risulta
priva di un corrispondente invio di header.

## Files Changed

Backend: routes/patients.ts, admin-rooms.ts, appointments.ts, therapy.ts, consegne.ts, note.ts,
operators.ts, patient-therapies.ts, patient-diary.ts, patient-intake.ts, narrative-sections.ts,
app.ts (riordino mount); nuovi test routes/__tests__/patients-auth.test.ts,
routes/__tests__/therapy-auth.test.ts.

Frontend: nuovo lib/operatorSession.ts; modificati App.tsx, lib/cachedFetch.ts,
components/operator/cartella/TerapiaFarmacologicaTab.tsx,
components/shared/DischargeLetterImport.tsx,
components/operator/cartella/DiarioPazienteTab.tsx,
components/operator/cartella/NarrativeSectionsTab.tsx, components/admin/RoomsManagement.tsx.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 (401 senza header) | PASS | Rieseguito contro Postgres reale (vedi Runtime Evidence): 401 immediato senza header, short-circuit confermato anche con DB raggiungibile. |
| AC2 (200/comportamento invariato con header validi) | PASS | Rieseguito contro Postgres reale: con header validi la richiesta raggiunge l'handler e la query Prisma reale (`GET /patients → 1 record`), esito applicativo confermato, non solo il pass-through del middleware. |
| AC3 (nessun 401 visibile nell'app frontend) | PASS | Backend+frontend avviati contro il Postgres di test reale; script Playwright ad-hoc (`check-401.mjs`, non committato) ha aperto l'app, selezionato ruolo Operatore, navigato Pazienti/Agenda/Consegne e osservato tutte le risposte di rete verso il backend: 14/14 chiamate 200, **zero 401**. |
| AC4 (tsc --noEmit pulito) | PASS | `cd backend && npx prisma generate ... && npx tsc --noEmit` → 0 errori. `cd frontend && npx tsc --noEmit` → 0 errori (verificato piu' volte durante l'implementazione). |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA | |
| Integration | PASS | 9 test (patients-auth, therapy-auth) rieseguiti contro Postgres reale: tutte le assert passano, incluso l'esito applicativo pieno con header validi (non piu' solo pass-through del middleware). Suite backend completa: 435/435 verde nella stessa sessione (dopo un fix separato a una race condition trovata in `appointment-service.ts`, task `transazioni-e-vincoli-race-condition-letti-e-appuntamenti`). |
| API | PASS | Backend live avviato contro Postgres di test reale (porta 3001); verificato via Playwright (vedi Playwright) che ogni chiamata reale dal frontend riceva 200, non 401. |
| Playwright | PASS | Backend (:3001) + frontend (:5173) avviati contro il Postgres di test; script ad-hoc `check-401.mjs` ha selezionato il ruolo Operatore e navigato Pazienti/Agenda/Consegne, osservando tutte le risposte di rete: 14/14 chiamate 200, zero 401. Screenshot dashboard operatore confermata renderizzata (bodyChars=710, consoleErrors=0) via `driver.mjs shot`. |
| Persistence | NA | |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | NA | Nessun nuovo secret/log PII introdotto (solo header id/ruolo, gia' loggati altrove nel progetto). |

## Runtime Evidence

Rivalidato il 2026-08-05 contro un Postgres reale: servizio Postgres Railway dedicato e usa-e-getta
(progetto `glistening-friendship`, NON il Postgres di produzione), esposto via
`railway connect --tunnel-only` (tunnel SSH locale), migrato con `prisma migrate deploy`.
Backend (`npm run dev:backend`, porta 3001) e frontend (`npm run dev:frontend`, porta 5173) avviati
puntando a quel DB. `driver.mjs shot` (ruolo Operatore) conferma il rendering della dashboard
(bodyChars=710, consoleErrors=0). `check-401.mjs` (script Playwright ad-hoc scritto per questa
verifica, non committato) naviga Pazienti/Agenda/Consegne e registra ogni risposta di rete verso
il backend: 14/14 chiamate `200`, **zero `401`**. Stack (backend/frontend) fermato a fine sessione
di validazione; il Postgres di test Railway resta attivo su decisione dell'utente, per un eventuale
riuso in validazioni successive (nessun dato reale, solo pazienti sintetici di test).

## Logs

`check-401.mjs`: 14 chiamate backend osservate, tutte `200` (`/patients`, `/consegne`,
`/operators/schedules`, `/notes`, `/appointments`, `/patients/:id/cartella` x3, `/admin/rooms`,
`/operators`, `/ai/extraction/status`, `/patients/settings`, `/therapy-slots`). Solo path ed esito,
nessun valore clinico.

## Residual Risks

- **`requireOperator` resta un gate debole** (si fida di header client-side non verificati): non
  risolve il rischio di sicurezza reale, e' un primo argine. L'autenticazione forte (Entra ID) e'
  un task separato, non ancora pianificato in dettaglio.
- Durante l'indagine e' emerso che il progetto Railway collegato a questo repo ha un solo
  environment (`production`): nessun ambiente dev/staging remoto disponibile per i test — per
  questa validazione e' stato provvisto un Postgres Railway separato e usa-e-getta invece di
  usare quello di produzione.
- Smoke Playwright limitato a tre sezioni (Pazienti, Agenda, Consegne) con un operatore; non copre
  ogni tab/route dell'app ne' il ruolo Amministratore.

## Final Decision

CLOSED — VERIFIED
