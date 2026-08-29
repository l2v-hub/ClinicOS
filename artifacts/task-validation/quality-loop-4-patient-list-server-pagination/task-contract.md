# Task Contract

## Task

- Title: Quality loop 4 patient list server pagination
- Slug: quality-loop-4-patient-list-server-pagination
- Type: refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no (uses additive cycle 3 contracts) |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes (refresh/navigation only) |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

PatientList riceve il roster completo caricato al login e filtra nome, MRN, email, telefono e sesso
nel browser. Entrando nella pagina richiede inoltre il riepilogo clinico globale senza `patientIds`.
Il nuovo endpoint `/patients/page` non ha ancora consumer reali.

## Expected Behaviour

PatientList deve richiedere pagine da massimo 50 record, ricercare nome/MRN e filtrare sesso sul
server, mostrare un caricamento incrementale esplicito e richiedere il riepilogo clinico soltanto
per gli ID della pagina ricevuta. Risposte obsolete devono essere ignorate/annullate. Il roster
legacy in App resta temporaneamente per agenda, Agnos, hash e lookup non ancora migrati, ma non e'
piu' la fonte della lista pazienti.

## Acceptance Criteria

- AC1: apertura PatientList usa `/patients/page?limit=50` e non filtra il roster legacy.
- AC2: ricerca con debounce e filtro sesso azzerano il cursor; una risposta obsoleta non sostituisce
  risultati piu' recenti.
- AC3: "Carica altri" usa `nextCursor`, accoda senza duplicati e sparisce quando `hasMore=false`.
- AC4: ogni pagina richiede `/patients/clinical-summary?patientIds=...` solo per i suoi massimo 50 ID;
  App non chiama piu' il summary globale.
- AC5: loading, errore, nessun risultato e conteggio caricato/totale sono distinguibili; il placeholder
  ricerca descrive soltanto i campi supportati dal server.
- AC6: delete/import senza navigazione possono ricaricare la prima pagina; import con patientId
  conserva la navigazione alla cartella creata.
- AC7: build, test frontend, test helper pagination, security e secret scan restano verdi.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Merge pagine senza duplicati e URL query |
| Integration | no | Backend invariato e DB non disponibile |
| API | yes | Contratti backend gia' coperti nel ciclo 3 |
| Playwright | no | Stack autenticato/DB non disponibile |
| Persistence after refresh | no | Stato pagina effimero |
| Agnos action registry | no | Invariato |
| Voice simulation | no | Invariato |
| OCR/import test | yes | Callback refresh/navigation invariata |
| Security/privacy scan | yes | Nessun summary globale dalla lista |

## Evidence Plan

- validation-report.md
- unit/frontend test output
- build output
- static network-contract check
- secret scan

## Risks

- `ClinicalTable` mantiene una propria paginazione client interna sopra le pagine server; il ciclo
  limita comunque memoria e rete ma unifica i due controlli in un passaggio UX successivo.
- Il filtro stato ricovero opera sui record caricati perche' `/patients/page` non espone ancora il
  filtro derivato dal JSON clinico; le label devono dichiarare conteggi visibili, non globali.
- Agenda, ricerca globale, Agnos, hash e parametri multipaziente mantengono il roster legacy; non
  rimuoverlo finche' i rispettivi lookup server-side non sono implementati.

## Gate Status

READY FOR IMPLEMENTATION
