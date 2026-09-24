# Task Contract

## Task
- Title: Performance navigazione tra contesti (Lista Pazienti e altri)
- Slug: performance-navigazione-tra-contesti-lista-pazienti-e-altri
- Type: change
- Date: 2026-09-24

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Misurato su build di produzione (vite preview) con API stub a 200 ms di latenza + preflight CORS (come Railway):
- ogni cambio contesto svuota lo stato della pagina e rifà le fetch mostrando placeholder "Caricamento…";
- primo accesso a ogni sezione/tab: download del chunk lazy con schermata "Caricamento modulo…";
- Lista Pazienti: contenuto visibile dopo 470–1250 ms a ogni visita (2–4 richieste in catena);
- Consegne 1300–1650 ms, Agenda 590–1000 ms, Note 830–1500 ms, Parametri 810–1360 ms, scheda paziente 500–840 ms, tab scheda 450–800 ms;
- baseline: contentAvg 627 ms, p50 532 ms, max 1653 ms, 27/34 navigazioni oltre 300 ms (perf/baseline-preview.json).

## Expected Behaviour

Navigando tra Lista Pazienti e gli altri contesti (Dashboard, Consegne, Agenda, Note, Terapia, Parametri, scheda paziente e relativi tab) l'attesa percepita è quasi nulla:
- una pagina già visitata nella sessione si ridisegna subito con gli ultimi dati (stale-while-revalidate) e si aggiorna in background senza placeholder;
- i chunk lazy vengono precaricati dopo il login, quindi il primo accesso a una sezione non mostra "Caricamento modulo…";
- il cambio pagina avviene in una transition: la pagina precedente resta visibile finché la nuova non è pronta;
- nessuna modifica a backend, schema, API o VITE_API_URL.

## Acceptance Criteria

- AC1: sulla build di produzione (preview + stub 200 ms) la mediana del tempo "contenuto visibile" per le navigazioni di ritorno (seconda visita) è < 150 ms e nessuna navigazione di ritorno supera 300 ms.
- AC2: nessun cambio contesto mostra "Caricamento modulo…" dopo il login (chunk precaricati); le navigazioni complessive del percorso di misura scendono da 27/34 a ≤ 8/34 oltre 300 ms.
- AC3: i dati mostrati da cache vengono rivalidati: dopo un ritorno in Lista Pazienti parte comunque la richiesta di aggiornamento e il DOM riflette la risposta (test con stub che cambia i dati tra due visite).
- AC4: nessuna regressione funzionale: tsc + vite build verdi, test node del frontend verdi, nessun errore console nuovo nel percorso di misura; logout svuota tutte le cache di sessione.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | test node esistenti frontend + nuovi test per la cache di sessione |
| Integration | no | |
| API | no | |
| Playwright | yes | harness perf/measure.mjs prima/dopo + evidenza screenshot |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

- Dati stantii mostrati per un istante: mitigato dalla rivalidazione automatica a ogni visita e dall'invalidazione dopo mutazioni.
- Memoria: cache limitata all'ultima pagina per chiave, svuotata al logout (sessionCache.clear).
- Divergenza branch: il lavoro parte da origin/codex/subtle-dashboard-notifications (codice in produzione), non da main (fermo al 10/08).

## Gate Status

READY FOR IMPLEMENTATION
