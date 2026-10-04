# Task Contract

## Task
- Title: UX diario thread e allergie gravi
- Slug: ux-diario-thread-e-allergie-gravi
- Type: feature
- Date: 2026-10-04

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Le allergie gravi sono ambra. Il diario mostra la segnalazione e una traccia piatta poco riconoscibile; una priorità importante è chiamata valore precedente. Il backend sorgente già conserva le conferme condivise nominative delle urgenze, ma il backend online precedente non espone questo protocollo.

## Expected Behaviour

Un unico avviso azionabile rosso per allergie gravi, ambra per altre allergie, con spazio dal contenuto. Ogni voce del diario conserva autore, ruolo, data, priorità originale e contenuto; una risposta collegata mostra chi ha confermato lettura e comprensione oppure lo stato verificato di attesa/indisponibilità. Ho capito resta esplicito, rispetta permessi e aggiorna soltanto su conferma valida del server. La conferma non certifica il completamento clinico.

Ambito di questo rilascio: frontend e test, nessuna modifica di API/schema/configurazione. La disponibilità online della persistenza condivisa richiede il rilascio backend già preparato nel task precedente, ancora da autorizzare; non inventare nominativi o risposte per aggirare questa dipendenza.

## Acceptance Criteria

- AC1: Una sola banda allergie azionabile; rosso per grave, ambra per non grave; spaziatura e nessun overflow a 390 e 1150 px.
- AC2: Segnalazione originale e risposta associata alla stessa voce: nome, ruolo e data completa del confermatore verificato; priorità originale conservata e nessuna etichetta completata/valore precedente.
- AC3: Urgenza attiva espone attesa e Ho capito soltanto al non autore; errore non produce risposta di successo; ricevuta valida persiste dopo reload e conserva le restrizioni esistenti.
- AC4: Stato storico senza nominativo, protocollo mancante e letture personali legacy restano distinti; normale/importante non acquisiscono una presa in carico fittizia.
- AC5: QA indipendente delle cinque fasi, build e regressioni pertinenti; push e pubblicazione frontend autorizzati, controllo online in sola lettura e limite backend dichiarato.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Regressioni focused e proiezione delle risposte. |
| Integration | yes | Feed reale con API sintetica e aggiornamento della conferma. |
| API | no | |
| Playwright | yes | Autore, successo, errore, storico, dati mancanti, responsive e allergie. |
| Persistence after refresh | yes | Ricevuta server dopo conferma e reload nel fixture sintetico. |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | Nessun dato clinico reale negli artifact pubblicati, nessun bypass permessi. |

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

Il backend online legacy non restituisce la nuova traccia: UI esplicita indisponibilità, senza convertire completata/assegnatario in conferma. Conferma condivisa disponibile solo per urgenze nel protocollo esistente. Nessuna operazione clinica sul browser online; test con dati sintetici locali. Root unico writer, discovery read-only e QA in checkout separato. Rilascio backend/database escluso da questo publish frontend.

## Gate Status

READY FOR IMPLEMENTATION
