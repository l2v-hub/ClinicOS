# Task Contract

## Task

- Title: HMI parità 8: agenda come il prototipo
- Slug: hmi-parita-8-agenda-come-il-prototipo
- Type: feature
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

L'agenda operatore (vista Giorno) è diversa dal prototipo HMI 1 (artifacts/hmi-parity/proto/agenda.png):

- Il titolo è "Agenda operatore".
- Vista, navigazione e filtri di stato stanno sopra la pagina.
- Le fasce sono righe con l'ora solo sulle ore piene, "+ Disponibile" su ogni fascia libera e card colorate alte con badge.

Il prototipo invece ha:

- "Agenda di oggi" con "data · fasce da 30 minuti";
- una card con la data e "Nuovo appuntamento";
- una riga per ogni fascia da 30 minuti con l'ora;
- l'appuntamento come pillola su una riga (titolo in grassetto e dettagli).

## Expected Behaviour

Agenda operatore come il prototipo, con gli stessi dati e le stesse funzioni:

- **Intestazione**: "Agenda di oggi" (oppure "Agenda" se non è oggi o se la vista non è Giorno). Sottotitolo "operatore · data · fasce da 30 minuti".
- **Strumenti**: filtri di stato, vista Giorno/Settimana/Mese e navigazione in una riga sopra la card, con gli stessi controlli accessibili.
- **Card del giorno**:
  - titolo con la data e pulsante primario "Nuovo appuntamento", che apre il modulo di oggi alla prima fascia libera;
  - una riga per fascia da 30 minuti, con l'ora sempre visibile;
  - fascia libera vuota ma cliccabile ("Crea appuntamento alle HH:MM", come oggi), con "+ Disponibile" solo al passaggio o al fuoco;
  - appuntamento come pillola: tipo in grassetto, poi "paziente · durata", stato e urgenza come badge a destra.
- Selezione, azioni (modifica/annulla/elimina), nota e link alla cartella del paziente restano come oggi.
- Le fasce terapia restano dove sono.
- Le viste Settimana e Mese restano invariate.
- L'agenda multi-operatore dell'admin non cambia.

## Acceptance Criteria

- AC1: a 1180 × 820 intestazione "Agenda di oggi" e sottotitolo con "fasce da 30 minuti"; card con data e "Nuovo appuntamento" da 48 px; righe per ogni fascia con l'ora; pillole su una riga con tipo, paziente, durata e stato.
- AC2: il clic su una pillola la seleziona e mostra le azioni; il nome del paziente apre la cartella; una fascia libera apre il modulo all'ora giusta; "Nuovo appuntamento" apre il modulo alla prima fascia libera di oggi.
- AC3: il filtro di stato, le viste Settimana/Mese e la navigazione funzionano come oggi; lo stato di errore offre "Riprova".
- AC4: nessuno scorrimento orizzontale a 390, 768, 1024, 1180 e 1440; l'agenda admin è invariata.
- AC5: la build passa; nessun nuovo test fallito rispetto alla baseline (test di intestazione aggiornato al nuovo titolo).

## Test Plan

| Test type                 | Required | Reason                                |
| ------------------------- | -------: | ------------------------------------- |
| Unit                      |      yes | test sorgente agenda aggiornati       |
| Integration               |       no |                                       |
| API                       |       no | stessa API                            |
| Playwright                |      yes | aspetto, selezione, modulo, larghezze |
| Persistence after refresh |       no |                                       |
| Agnos action registry     |       no |                                       |
| Voice simulation          |       no |                                       |
| OCR/import test           |       no |                                       |
| Security/privacy scan     |       no |                                       |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (full suite, build)
- logs/playwright-evidence.txt; confronto con proto/agenda.png

## Risks

- Classi `agt-` condivise con l'agenda admin: gli stili nuovi sono limitati a `.agt-view--hmi`.

## Gate Status

READY FOR IMPLEMENTATION
