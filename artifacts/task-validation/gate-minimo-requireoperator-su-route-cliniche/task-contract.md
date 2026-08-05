# Task Contract

## Task
- Title: Gate minimo requireOperator su route cliniche
- Slug: gate-minimo-requireoperator-su-route-cliniche
- Type: feature
- Date: 2026-07-31

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

Le route Express che toccano dati paziente (patients, appointments, admin-rooms, consegne, note,
operators, patient-diary, patient-intake, patient-therapies, therapy, narrative-sections) non
applicano alcun middleware di autenticazione/autorizzazione: sono raggiungibili da chiunque
conosca l'URL del backend, senza identificarsi. Solo le route AI (ai-actions, ai-voice, ai-audit,
ai-assistant-public, ai-jobs, intake-drafts) e patient-documents applicano gia' `requireOperator`
(gate basato su header `X-Operator-Id`/`X-Operator-Role`, definito in `backend/src/ai/auth.ts`) o
`requireEntraOperator` (JWT Entra ID verificato). Il frontend invia questi header solo per i flussi
AI/documenti (9 file), non per le chiamate CRUD dirette (App.tsx, PatientList.tsx, PatientDetail.tsx
ecc. usano fetch/cachedGetJson senza header operatore).

## Expected Behaviour

Tutte le route che leggono/scrivono dati paziente richiedono `requireOperator` (header-based, primo
argine — non sostituisce l'autenticazione forte Entra ID, che resta task separato non in scope qui).
Il frontend allega `X-Operator-Id`/`X-Operator-Role` a ogni chiamata verso queste route tramite un
nuovo helper `apiFetch` (letto dall'operatore loggato in sessione), cosi' l'app continua a
funzionare invariata per un utente che ha fatto login. Una richiesta priva di questi header riceve
401; una richiesta con ruolo non ammesso riceve 403.

## Acceptance Criteria

- AC1: Le route patients, appointments, admin-rooms, consegne, note, operators, patient-diary,
  patient-intake, patient-therapies, therapy, narrative-sections rispondono 401 a una richiesta
  senza header `X-Operator-Id`/`X-Operator-Role`.
- AC2: Con gli header valorizzati con un ruolo ammesso (operatore/admin/operator/manager), le stesse
  route rispondono con lo stesso comportamento funzionale di prima (200/altri codici invariati).
- AC3: L'app frontend, usata da un utente loggato (Login demo), continua a funzionare senza 401
  visibili nella UI: liste pazienti, dettaglio paziente, agenda, consegne, note, terapie si caricano
  e salvano come prima.
- AC4: `cd backend && npx tsc --noEmit` e `cd frontend && npx tsc --noEmit` passano senza errori.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | |
| Integration | yes | Nuovo test backend su almeno 2 route (patients, therapy) che verifica 401 senza header e 200 con header validi, sul modello di `farmaci-auth.test.ts` gia' esistente. |
| API | yes | Verifica manuale/scriptata con curl o test Node delle route elencate in AC1. |
| Playwright | yes | Smoke E2E del flusso operatore (login demo -> lista pazienti -> apertura cartella) per confermare AC3 senza 401. |
| Persistence after refresh | no | Nessuna modifica al modello dati. |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Nessun nuovo secret/PII coinvolto; il gate e' header-based, non introduce logging di dati sensibili. |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test di integrazione backend (route protette)
- output tsc --noEmit (frontend + backend)
- trace/report Playwright dello smoke E2E
- sanitized logs se emergono errori runtime durante la validazione

## Risks

- **Rischio principale**: se l'helper `apiFetch` non viene applicato a TUTTE le chiamate verso le
  route gatate, il frontend riceve 401 su funzionalita' che oggi funzionano. Mitigazione: mappare
  ogni endpoint gatato ai file frontend che lo chiamano (grep mirato) prima di attivare il gate,
  e verificare con lo smoke Playwright prima di chiudere il task.
- **Rischio secondario**: `requireOperator` e' un gate debole (si fida di header client-side, non
  verificati). Non risolve il rischio di sicurezza reale (bypassabile inventando gli header) — e'
  esplicitamente un primo argine in attesa del task separato su Entra ID reale. Documentato anche
  nel report di audit consegnato all'utente.

## Gate Status

READY FOR IMPLEMENTATION
