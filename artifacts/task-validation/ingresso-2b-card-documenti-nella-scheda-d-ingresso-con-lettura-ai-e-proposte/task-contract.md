# Task Contract

## Task

- Title: Ingresso 2b: card Documenti nella scheda d'ingresso con lettura AI e proposte
- Slug: ingresso-2b-card-documenti-nella-scheda-d-ingresso-con-lettura-ai-e-proposte
- Type: feature
- Date: 2026-09-30

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

- **Persistenza**: si usano solo gli endpoint del ciclo 2a (#372, già in produzione) e quelli esistenti dei job a pagine. Nessuna modifica al backend né allo schema.
- **Privacy**: nessun contenuto clinico né immagini di pagine negli URL o nella console; il testo OCR resta nelle risposte delle API.
- **OCR/Import**: l'unione dei risultati AI nella bozza segue le regole di proprietà del backend (`mergeAiIntoDraft`), che il frontend non reimplementa.

## Current Behaviour

Scelta approvata dall'utente (2026-09-28): la scheda d'ingresso deve seguire la versione completa del prototipo HMI 1 (`artifacts/hmi-parity/proto/ingresso-docs.png`). Il ciclo 1 (#371) ha portato la scheda su una sola pagina con indice. Il ciclo 2a (#372) ha aggiunto il backend per:

- collegare un job d'import a pagine a una bozza aperta (`POST/DELETE /intake/drafts/:id/import-job`);
- unire i risultati AI per lettera o finali (`POST /intake/drafts/:id/merge-import`);
- registrare la provenienza dei campi (`_fieldOrigin`) e le proposte (`_fieldProposals`);
- decidere una proposta (`POST /intake/drafts/:id/field-proposals/:pid/decide`);
- bloccare la conferma con proposte aperte (409 `field_proposals_pending`).

Nessuna UI usa ancora questi endpoint. Oggi i documenti si importano solo dal flusso separato (DischargeImportModal / ImportDocumentsWorkspace), che crea la bozza alla fine. Non si può aggiungere un documento a una scheda che si sta già compilando.

## Expected Behaviour

La scheda d'ingresso (`IntakeWorkspace`) ha in cima una **card Documenti**, come nel prototipo:

1. **Aggiunta delle pagine.** Titolo "Documenti" con il conteggio "N/M pagine lette" e due pulsanti design system, "Scatta pagina" (fotocamera sul tablet, `capture`) e "Carica file".
   - Al primo caricamento crea un job d'import a pagine, riusando `ImportSessionApi` e la logica esistente di upload, validazione file e limiti, e lo collega alla bozza con `import-job` (`expectedDraftVersion`, `requestId`).
   - Le pagine successive si aggiungono allo stesso job.
2. **Lettura.** Una barra di avanzamento e la frase "L'AI sta leggendo: puoi già scrivere. I campi che hai compilato tu non vengono mai sovrascritti."
   - Durante l'elaborazione l'operatore continua a compilare la scheda senza blocchi.
   - Quando un'unità (lettera) è pronta (`groups[].resultHash` nuovo), il frontend chiama `merge-import` per quella lettera.
   - A revisione pronta, fa l'unione finale (`manifestRevision`, `resultHash`).
   - Dopo ogni unione **ricarica la bozza** dal server (versione compresa), senza perdere quanto l'operatore sta scrivendo: un salvataggio in corso viene completato o ripetuto sulla versione nuova, senza sovrascrivere.
3. **Campi scritti dall'AI.** Hanno uno stile distinto (tinta viola del prototipo, via token) e un'etichetta "AI" (`ds-badge`), letti da `_fieldOrigin`.
   - Quando l'operatore modifica il campo, il campo torna suo e perde lo stile AI; lo decide il backend alla prossima unione.
   - La provenienza per pagina ("L1 · p. 1") e il documento a fianco arrivano nel ciclo 3.
4. **Proposte.** Quando l'AI trova un valore diverso da quello scritto dall'operatore, la scheda mostra una proposta vicino al campo o in un riepilogo in cima: "L'AI ha letto <valore>" con "Usa questo valore" / "Tieni il mio" (`field-proposals/:pid/decide`).
   - Con proposte aperte "Crea paziente" è bloccato e il messaggio dice quante ne restano.
   - Il 409 `field_proposals_pending` viene tradotto in italiano.
   - Le proposte di terapia già esistenti (`_importProposals`) continuano a usare la UI attuale.
5. **Chiavi riservate.** Il PATCH della bozza non invia mai `_fieldOrigin`, `_fieldProposals` né `_aiMerge` (esclusi da `editableDraftPatch`).
6. **Scollegamento e annullamento.** Si può rimuovere il documento collegato finché la bozza non ha `_importSource` (`DELETE import-job`), con conferma. I valori già inseriti restano.
7. **Invariati.** Il flusso separato "Nuovo ingresso → Documenti" (DischargeImportModal) e la scheda compilata a mano senza documenti non cambiano. Design system canonico, controlli da 48px, nessuno scorrimento orizzontale.

## Acceptance Criteria

- **AC1.** Su una scheda aperta, "Carica file" con una pagina:
  - crea il job e lo collega alla bozza (una sola chiamata `import-job`, con `expectedDraftVersion`);
  - mostra "0/1 pagine lette" e la frase sull'AI;
  - l'operatore può scrivere nei campi durante l'elaborazione.
- **AC2.** Quando la lettera è pronta:
  - `merge-import` per lettera;
  - bozza ricaricata;
  - i campi vuoti si riempiono con lo stile AI e l'etichetta "AI";
  - un campo scritto prima dall'operatore NON cambia e compare una proposta.
- **AC3.** Decisioni sulle proposte:
  - "Usa questo valore" applica il valore letto; il campo resta una scelta dell'operatore (il backend registra `by: operator`, quindi senza stile AI) — correzione del 2026-09-30 dopo la QA;
  - "Tieni il mio" la chiude e il valore resta;
  - entrambe via `decide` con `requestId` e `expectedDraftVersion`;
  - con proposte aperte "Crea paziente" è bloccato e il motivo è visibile.
- **AC4.** Unione finale:
  - a revisione pronta, un'unica chiamata `merge-import` finale;
  - conteggio "M/M pagine lette";
  - un 409 di versione viene gestito ricaricando la bozza e ripetendo una sola volta, senza doppie unioni.
- **AC5.** Il PATCH non contiene mai chiavi riservate (test unitario e controllo in rete). Lo scollegamento rimuove il job e conserva i valori.
- **AC6.** Nessuna regressione:
  - scheda a mano e flusso separato "da documenti" invariati;
  - `npm run build` ok;
  - `npm test` senza fallimenti nuovi rispetto alla baseline (9 noti);
  - guardia del design system ok.
- **AC7.** Larghezze 390, 768, 1024, 1180, 1440: nessuno scorrimento orizzontale, controlli ≥ 44px su touch. Nessun testo clinico negli URL né in console.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                                   |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit                      |      yes | orchestrazione pura: quando unire (hash nuovo, finale una sola volta), esclusione delle chiavi riservate dal patch, lettura di `_fieldOrigin` e `_fieldProposals`, testi |
| Integration               |       no | backend invariato (ciclo 2a già verificato in CI)                                                                                                                        |
| API                       |       no |                                                                                                                                                                          |
| Playwright                |      yes | flussi AC1–AC5 con `page.route` per job, bozza e unione (lo stub non ha gli endpoint delle bozze), sweep di larghezze, screenshot                                        |
| Persistence after refresh |      yes | ricaricando la scheda restano campi AI, proposte e documento collegato                                                                                                   |
| Agnos action registry     |       no |                                                                                                                                                                          |
| Voice simulation          |       no |                                                                                                                                                                          |
| OCR/import test           |      yes | le unioni per lettera e quella finale nella sequenza corretta (simulate)                                                                                                 |
| Security/privacy scan     |      yes | nessun testo clinico o immagine negli URL o in console                                                                                                                   |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unitari e della build
- screenshot: card Documenti in lettura, campi AI, proposta, conferma bloccata, fine lettura, larghezze
- log dell'evidence Playwright

## Risks

- **Contesa di versione** tra l'autosalvataggio e l'unione: si gestisce ricaricando la bozza e ripetendo, senza perdere quanto digitato. È il rischio principale e va testato.
- **Limite di elaborazione per operatore** (`extractionCostGuard`): va mostrato come un messaggio chiaro, non come un errore generico.
- **Lo stub non ha le bozze**: l'evidence simula le API con `page.route`. La verifica reale sarà in produzione, dall'utente.
- **Memoria della macchina limitata**: un solo stub e una sola preview alla volta.

## Gate Status

READY FOR IMPLEMENTATION
