# Task Contract

## Task
- Title: Quality loop 2 therapy query and AI ownership
- Slug: quality-loop-2-therapy-query-ai-ownership
- Type: refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

`buildTherapySlots` legge tutte le terapie attive con schedule, cartella e assegnazioni, poi filtra
in memoria la data richiesta. Le somministrazioni del giorno vengono caricate senza limitarle ai
pazienti realmente presenti negli slot. Le route dei job di estrazione e delle bozze intake
richiedono un operatore, ma non verificano che l'operatore sia il proprietario della risorsa; un ID
conosciuto consente quindi letture o mutazioni cross-operatore. Il vecchio endpoint base64 di intake
non ha ownership persistita ed e' ancora accessibile a qualunque operatore.

## Expected Behaviour

La selezione delle terapie deve avvenire principalmente nel database, caricando solo campi e
relazioni necessari per il giorno richiesto. Le somministrazioni devono essere limitate ai pazienti
delle terapie candidate. Un job o una bozza temporanea deve essere accessibile solo al creatore,
salvo ruoli `admin` e `manager`; risorsa inesistente e risorsa altrui devono entrambe rispondere 404.
Il vecchio flusso base64, non usato dal frontend corrente e privo di ownership, deve essere limitato
ai ruoli privilegiati e marcato come deprecato.

## Acceptance Criteria

- AC1: la query `PatientTherapy` applica in Prisma stato, tipo e intervallo/data una-tantum prima
  del materializzarsi dei record; la semantica dei giorni della settimana resta invariata.
- AC2: la query carica soltanto i campi necessari e al massimo l'assegnazione stanza attiva piu'
  recente; non include tutte le assegnazioni e non carica l'intera riga cartella.
- AC3: le somministrazioni del giorno sono richieste soltanto per i patientId candidati e non viene
  eseguita la seconda query se non esistono terapie candidate.
- AC4: tutte le route `/:id` dei job AI e delle bozze intake negano in modo non enumerabile una
  risorsa altrui; il proprietario e i ruoli privilegiati mantengono l'accesso.
- AC5: `/intake/drafts/from-import` verifica l'ownership del job sorgente e `/ai/extraction/jobs/sweep`
  richiede ruolo privilegiato.
- AC6: il router legacy `/patient-intake` richiede `admin` o `manager`, emette un header di
  deprecazione e impone un limite esplicito al payload base64.
- AC7: build backend, test di ownership, test terapia e test import pertinenti sono verdi; nessun
  nuovo high/critical viene introdotto dall'audit dipendenze.
- AC8: il modal import usa l'header `Authorization: Bearer` della sessione quando disponibile,
  mantenendo gli header demo soltanto come fallback non-production gestito dal backend.
- AC9: conferma e mancata somministrazione persistono sempre l'attore autenticato, ignorano
  identita' inviate dal client e non trasformano una dose gia' erogata in non erogata.
- AC10: una chiave di idempotenza gia' appartenente a un altro operatore non restituisce il job e
  produce la stessa risposta 404 non enumerabile, incluso il race sulla chiave unica.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Predicato ownership e costruzione filtro terapia |
| Integration | yes | Middleware route e compatibilita servizi intake |
| API | yes | 404 cross-owner, accesso owner/privilegiato, sweep RBAC |
| Playwright | no | Modifica limitata all'helper fetch, coperta da test/build |
| Persistence after refresh | no | Nessun nuovo flusso UI persistente |
| Agnos action registry | no | Catalogo azioni invariato |
| Voice simulation | no | Voce invariata |
| OCR/import test | yes | Job e bozze sono parte del flusso import |
| Security/privacy scan | yes | IDOR e dati clinici temporanei |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- sanitized logs if backend/AI
- API test output if backend

Evidenze specifiche: test negativi cross-operatore, build TypeScript, test del flusso import e
confronto strutturale della query Prisma prima/dopo. Nessun contenuto clinico reale nei log.

## Risks

- I job storici con `createdById = null` diventano accessibili solo ad admin/manager: scelta
  fail-closed necessaria per non indovinare un proprietario.
- La cartella JSON resta fallback per camera/letto dei soli pazienti candidati; eliminarla richiede
  un backfill verificato delle assegnazioni.
- Gli indici nuovi richiedono migrazione prima di produrre beneficio nel database distribuito e
  saranno applicati soltanto durante un deploy autorizzato e verificato.
- La paginazione pazienti e il summary bounded non fanno parte di questo slice e restano blocker
  espliciti per la chiusura complessiva del programma performance.

## Gate Status

READY FOR IMPLEMENTATION
