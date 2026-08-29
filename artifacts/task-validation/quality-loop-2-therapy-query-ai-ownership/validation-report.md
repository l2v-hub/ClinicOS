# Task Validation Report

## Task

- Title: Quality loop 2 therapy query and AI ownership
- Slug: quality-loop-2-therapy-query-ai-ownership
- Branch: `codex/quality-loop-20260829`
- Commit: same commit as this report (`git rev-parse HEAD` after checkout)
- Date: 2026-08-29

## Implementation Summary

Secondo incremento eseguito nel worktree isolato. Tutte le route AI con parametro `:id` applicano
ora una policy di ownership centralizzata: il creatore accede alla propria risorsa, `admin` e
`manager` hanno accesso privilegiato esplicito, mentre ID inesistente, risorsa altrui e risorsa
legacy senza proprietario restituiscono lo stesso 404. La policy copre job di estrazione, risultato,
file, transizioni e conferma, oltre a lettura, autosave e conferma delle bozze intake. Anche la
creazione da `importJobId` e le chiavi di idempotenza sono vincolate all'attore autenticato.

Il vecchio router base64, non usato dal frontend corrente e privo di owner persistito, e' stato
limitato ad admin/manager, marcato `Deprecation`/`Sunset` e dotato di allowlist MIME e limite 5 MB.
Il modal import include ora il bearer token Entra della sessione. Le registrazioni terapia derivano
l'attore da `req.operator`, non dal body, e una dose gia' erogata non puo' essere ribaltata in
`non_erogata` tramite la route ordinaria.

`buildTherapySlots` filtra nel database stato, tipo e intervallo/data una-tantum prima di caricare le
relazioni; usa proiezioni mirate, una sola assegnazione stanza attiva e limita le somministrazioni ai
pazienti candidati. Se non esistono terapie candidate non esegue la query somministrazioni. Quattro
indici additivi accompagnano il nuovo access pattern.

## Files Changed

- `backend/src/ai/ownership-policy.ts`, `backend/src/ai/ownership.ts`, test ownership dedicato
- `backend/src/routes/ai-jobs.ts`, `backend/src/ai/upload/job-service.ts`, `backend/src/ai/types.ts`
- `backend/src/routes/intake-drafts.ts`, `backend/src/routes/patient-intake.ts`
- `backend/src/intake/draft-service.ts`, `backend/src/ai/upload/confirm-service.ts`
- `backend/src/therapies/therapy-query.ts`, `backend/src/therapies/therapy-slots.ts`
- `backend/src/therapies/clinical-actor.ts` e relativo test anti-spoof
- `backend/src/routes/therapy.ts`, `backend/src/routes/patient-therapies.ts`
- test query terapia e test API RBAC del ciclo
- `frontend/src/components/shared/DischargeImportModal.tsx`, test session header
- `prisma/schema.prisma` e migration `20260829130000_therapy_slot_query_indexes`

`start-claude-team.ps1` conserva drift preesistente di line ending e non deve essere incluso nel
commit. Gli artifact runtime Ruflo non sono parte del candidato e non devono essere inclusi.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | `therapyWhereForDate` applica `stato=attiva`, esclude `al_bisogno`, separa `una_tantum` e intervallo periodico nella query Prisma; test dedicato PASS. |
| AC2 | PASS | `select` esplicito per terapia, schedule e paziente; nested assignment filtrata per data, ordinata e `take: 1`; cartella limitata al solo campo fallback `data`. |
| AC3 | PASS | `patientIds` deduplicati; query somministrazioni con `date + patientId IN`; ramo vuoto restituisce `[]` senza seconda query. |
| AC4 | PASS (code) | Param guard unico per job/draft; test HTTP dimostra stesso status/body per foreign e missing, owner 200, legacy ownerless 404, manager 200. La bozza idempotente viene ricontrollata anche nel service. Verifica con DB reale rinviata. |
| AC5 | PASS | `from-import` e creazione con `importJobId` verificano il job; sweep richiede admin/manager e test operatore restituisce 403. |
| AC6 | PASS | Router legacy admin/manager, MIME PDF/JPEG/PNG, 5 MB, actor server-side, `Deprecation: true` e `Sunset` testati. |
| AC7 | PARTIAL | Build, schema, lint mirato, test frontend e focused backend verdi; suite DB completa non eseguibile senza PostgreSQL. Audit conserva 3 high transitivi Prisma/deepmerge-ts preesistenti. |
| AC8 | PASS | `DischargeImportModal` usa `operatorHeaders()`; test verifica `Authorization: Bearer`; build frontend PASS. |
| AC9 | PASS (code) | Somministrazioni, terapie dirette e terapie create dal wizard intake usano l'attore autenticato; le transizioni sono in isolamento serializable e i conflitti concorrenti restituiscono 409. Persistenza DB non esercitata. |
| AC10 | PASS (code) | Lookup iniziale e race `P2002` verificano `createdById`; owner diverso genera `not_found` mappato a 404. Test DB concorrente rinviato. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Build | PASS | Build monorepo frontend + backend completa; entry JS invariata a 134.62 KiB gzip. |
| Schema | PASS | `prisma validate` con URL sintattica: schema valido; Prisma Client generato in build. |
| Unit/API focused | PASS | Test nuovi: ownership, 404 non enumerante, RBAC legacy/sweep, query terapia, actor intake anti-spoof e bearer header. |
| Frontend regression | PASS | 149/149 test, 0 fail. |
| Security regression | PASS | 33/33 test non-DB su auth, CORS/header, upload security, ownership, RBAC e weekday/query terapia. |
| Lint | PASS | ESLint mirato: frontend 0 errori; backend 0 errori, soli warning preesistenti nel parser legacy/job service. |
| Secret scan | PASS | 0 finding in `frontend/src` e `frontend/index.html`. |
| Dependency audit | PARTIAL | `npm audit --omit=dev`: 0 critical, 3 high transitivi preesistenti. |
| Database integration | BLOCKED | Nessun PostgreSQL di test/configurazione `DATABASE_URL` disponibile nel worktree. |
| Load test | BLOCKED | Nessun dataset sintetico 10k/100k/1M e database di benchmark disponibili. |

## Runtime / Query Evidence

- Prima: tutte le `PatientTherapy` attive, tutte le schedule, tutte le assegnazioni e l'intera
  relazione cartella venivano materializzate prima dei filtri data/tipo.
- Dopo: data/tipo/intervallo sono nel `where` SQL; le assegnazioni sono filtrate e limitate a una;
  le colonne sono selezionate esplicitamente.
- Prima: tutte le `MedicationAdministration` della data venivano lette.
- Dopo: soltanto la data e i patientId candidati; zero query quando i candidati sono zero.
- Indici aggiunti: `(date, patientId)`, `(stato, tipo, dataSomministrazione)`,
  `(stato, dataInizio, dataFine)`, `(patientId, startDate, endDate)`.

## Logs

Gli output sono sanitizzati e non contengono dati clinici reali o credenziali. Un tentativo di suite
Entra con URL PostgreSQL non raggiungibile ha prodotto sei failure infrastrutturali `P1001`; non e'
considerato evidenza funzionale. La suite non-DB equivalente e i test del ciclo sono verdi.

## Residual Risks

- La policy owner e' per operatore, non ancora per struttura/reparto/paziente; serve ABAC tenant e
  assignment scope prima di considerare completo il perimetro autorizzativo.
- Le transizioni terapia usano isolamento serializable e mappano i conflitti a 409, ma il test
  concorrente su PostgreSQL reale resta obbligatorio prima del deploy.
- L'indice migration e la query devono essere verificati con `EXPLAIN ANALYZE` su un clone o dataset
  sintetico prima del deploy; creare indici su tabelle grandi puo' acquisire lock.
- Gli slot restano una risposta non paginata per tutti i pazienti con terapia nel giorno. La query e'
  molto piu' selettiva, ma non soddisfa ancora il gate assoluto di massimo 50-100 pazienti.
- `/patients`, `/patients/clinical-summary`, diario e altre liste mantengono letture non bounded; il
  ciclo successivo deve introdurre paginazione/search server-side e overview a dimensione fissa.
- Il legacy base64 resta disponibile ai ruoli privilegiati fino al sunset; la rimozione completa o
  l'ownership persistita richiede una decisione di migrazione.
- Restano attori client-provided in diario/appuntamenti e audit/idempotenza AI best-effort.
- Deploy e smoke test production restano bloccati da credenziali Vercel e configurazione Entra.

## Independent Review

Il piano e' stato derivato da audit read-only performance e sicurezza con modelli leggeri. Il review
finale ha trovato actor spoof nell'intake, ownership incoerente della bozza idempotente e race nelle
somministrazioni: tutti e tre sono stati corretti. Ha confermato la semantica del filtro terapia e
gli indici, lasciando PARTIAL paginazione, blob cartella, benchmark e `EXPLAIN ANALYZE`. Il finding
di build blocker era un falso positivo: `Operator.name` esiste e build backend/monorepo sono PASS.

## Final Decision

PARTIAL

Il candidato migliora in modo verificato query e isolamento delle risorse, ma il programma globale
non puo' chiudersi senza test DB/load, paginazione delle liste principali e deploy production con
Entra verificato.
