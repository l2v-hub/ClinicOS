# Task Contract

## Task
- Title: 449 consegne scrivere e confermare
- Slug: 449-consegne-scrivere-e-confermare
- Type: change
- Date: 2026-10-12

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

Issue #449. Nella pagina Consegne ogni nota non confermata ha due pulsanti di conferma («Conferma lettura» e «Ho capito», con una spiegazione); l'identità occupa 4 righe; c'è il link «Come funziona la conferma di lettura». Per scrivere servono 4 passaggi (Per paziente → paziente → «Nuova nota», presente due volte → modulo). Lo stesso gesto ha quattro nomi: Nuova nota, Segnalazione, Nuova consegna, Consegna. Prima del modulo compaiono i filtri «Dal / Al / Filtra storico» e «Pagina 1 · fino a 50 segnalazioni».

## Expected Behaviour

In cima alla pagina Consegne c'è «Scrivi una consegna»: paziente, testo (urgenza facoltativa), «Invia», senza cambiare vista; il paziente è preimpostato se si arriva da una cartella. Ogni nota ha un solo gesto: «Ho capito» sulle urgenze attive (che vale anche come lettura, lato server), «Letta» sulle altre, nessun pulsante per le proprie. L'identità sta in una riga. Il nome è unico, «consegna», in modulo, schede e pulsanti. Lo storico e i filtri per data stanno dietro «Storico e filtri per data». Il modello di urgenza lato server non cambia.

## Acceptance Criteria

- AC1: dalla pagina Consegne si scrive e si invia una consegna con al massimo 3 interazioni (paziente, testo, Invia), verificato con Playwright e nel DB.
- AC2: nessuna scheda nota (pagina Consegne e diario del paziente) mostra più di un pulsante di conferma.
- AC3: le etichette «Nuova nota», «Segnalazione», «Nuova consegna» sono unificate in «consegna» nei componenti delle consegne.
- AC4: il modello di urgenza resta invariato lato server: nessuna modifica backend; «Ho capito» usa lo stesso /ack.
- AC5: identità del paziente in una riga nelle schede della coda; nessun link «Come funziona la conferma»; filtri per data dietro un link.
- AC6: tsc, build e unit verdi; Turno #445/#446 senza regressioni.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | regola del gesto unico, etichette |
| Integration | no | |
| API | no | |
| Playwright | yes | scrivere in 3 interazioni, un pulsante per scheda |
| Persistence after refresh | yes | la consegna inviata è nel DB e nella coda dopo il reload |
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

DiarioPazienteTab è condiviso con la cartella: il gesto unico e lo storico dietro link valgono anche lì (coerenza voluta). Il modulo in cima riusa ConsegnaComposer e submitConsegna (bozze, esiti incerti), senza un nuovo percorso di salvataggio.

## Gate Status

READY FOR IMPLEMENTATION
