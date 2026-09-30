# Task Contract

## Task

- Title: Ingresso 3a: pannello documento a fianco e provenienza per lettera
- Slug: ingresso-3a-pannello-documento-a-fianco-e-provenienza-per-lettera
- Type: feature
- Date: 2026-09-30

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |      yes |
| Config / Env         |       no |

- **Privacy.** Le immagini delle pagine sono dati clinici. Si scaricano solo con `fetch` e le intestazioni dell'operatore (`operatorImportApi`), in blob tenuti solo in memoria. I blob URL vengono revocati alla chiusura del pannello, allo scollegamento del job e all'uscita dalla scheda. Niente `localStorage`, niente log, niente `cachedGetJson`.
- **OCR/Import.** Il pannello legge solo endpoint già esistenti: `GET /ai/extraction/jobs/:id/files/:docId/content` e lo stato delle pagine nel manifest.

## Current Behaviour

Con il ciclo 2b (#377) la scheda d'ingresso ha la card Documenti, e i campi scritti dall'AI hanno tinta e badge "AI" (da `_fieldOrigin`). Mancano due cose del prototipo HMI 1 (`artifacts/hmi-parity/proto/ingresso-docs.png`):

- **provenienza sul campo**: un'etichetta "L1 · p. 1" che dice da quale lettera arriva il valore;
- **documento a fianco**: un pannello a destra ("Lettera 1 · p. 1") con le schede delle pagine (L1·p1, L1·p2, … con ✓ o lettura in corso) e la pagina visibile.

`_fieldOrigin` registra già la lettera (`groupIds`) ma non la pagina. La pagina e il testo OCR arrivano con due PR backend successivi (3b e 3c).

## Expected Behaviour

1. **Etichetta di provenienza.** L'etichetta "AI" dei campi scritti dall'AI diventa un chip cliccabile con la lettera di origine: "L1", "L2"…
   - L'indice si ricava da `job.manifest.groups` ordinati per `sortOrder`.
   - Con più lettere nell'origine (unione finale) il chip mostra la prima, oppure "L1 + L2".
   - Se l'origine non ha lettere, o il job non è più collegato, il chip resta "AI" e non è cliccabile.
   - È un pulsante accessibile, con nome del tipo "Apri la lettera 1, da cui l'AI ha letto questo valore", ed è progettato per mostrare la pagina ("L1 · p. 2") quando `_fieldOrigin` avrà `pages` (ciclo 3c): se `pages` c'è, la usa già.
2. **Pannello documento** (`IntakeDocumentPanel`): si apre dal chip o da "Vedi documenti" nella card Documenti.
   - Terza colonna della scheda, come nel prototipo, su computer e tablet in orizzontale (≥ 1180px). Sotto quella larghezza è un pannello sovrapposto a tutta larghezza, con chiusura.
   - Intestazione "Lettera N · p. M" e pulsante di chiusura.
   - Schede una per pagina, `L{n}·p{m}`, con lo stato dal manifest: ✓ completata, indicatore di lettura in corso, errore.
   - Corpo con l'immagine della pagina selezionata. Si riusano `ImportSourceCache` e `ImportPageContent`, e per i PDF si mostra la pagina `sourcePageNumber`.
   - Si carica solo la pagina selezionata, mai tutte in anticipo.
   - Se la pagina non è disponibile (sessione scaduta, 404, rete) compare un messaggio chiaro, senza errori.
3. **Pulizia.** Una sola cache per job: `clear()` alla chiusura del pannello, allo scollegamento e all'uscita dalla scheda.
4. **Invariati.** Card Documenti, unioni, proposte, scheda a mano senza documenti e flusso separato "da documenti". Design system canonico: `ds-*`, token, controlli da 48px, niente rosso come brand.

## Acceptance Criteria

- **AC1.** Un campo scritto dall'AI dalla lettera g1 mostra il chip "L1". Con due lettere, un campo da g2 mostra "L2". Senza job collegato il chip resta "AI" e non è cliccabile.
- **AC2.** Il clic sul chip apre il pannello sulla lettera giusta:
  - il titolo è "Lettera N · p. 1";
  - le schede delle pagine riportano lo stato del manifest (✓ / in lettura / errore) e si aggiornano durante l'interrogazione;
  - l'immagine della pagina viene scaricata con le intestazioni dell'operatore e mostrata;
  - un'altra scheda carica la sua pagina.
- **AC3.** La chiusura del pannello revoca i blob URL (verificabile) e riporta il focus sul chip o sul pulsante che l'aveva aperto. Con Esc il pannello si chiude.
- **AC4.** Pagina non disponibile (404, 410, rete): messaggio in italiano nel pannello, nessun errore in console, la scheda resta utilizzabile.
- **AC5.** A 1180 e 1440 il pannello è una terza colonna, come nel prototipo. A 390, 768 e 1024 è sovrapposto a tutta larghezza. Nessuno scorrimento orizzontale; controlli ≥ 44px su touch.
- **AC6.** Nessuna regressione: evidence del ciclo 2b ancora verde, `npm run build` ok, `npm test` senza fallimenti nuovi (baseline di 9), guardia del design system ok.
- **AC7.** Privacy: nessun contenuto clinico né blob in `localStorage`, negli URL o in console. Le immagini si scaricano solo con fetch autenticato.

## Test Plan

| Test type                 | Required | Reason                                                                                                               |
| ------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | etichetta di provenienza (indice lettera, più lettere, pagine opzionali, job assente), elenco delle schede con stato |
| Integration               |       no |                                                                                                                      |
| API                       |       no | nessun endpoint nuovo                                                                                                |
| Playwright                |      yes | chip → pannello, schede, immagine (file stub via `page.route`), chiusura con revoca, errori, larghezze               |
| Persistence after refresh |       no | nessun dato nuovo salvato                                                                                            |
| Agnos action registry     |       no |                                                                                                                      |
| Voice simulation          |       no |                                                                                                                      |
| OCR/import test           |      yes | stato delle pagine dal manifest durante la lettura                                                                   |
| Security/privacy scan     |      yes | fetch autenticato, blob revocati, niente dati in localStorage, URL o console                                         |

## Evidence Plan

Required evidence:

- validation-report.md
- output dei test unitari e della build
- screenshot: campi con chip L1/L2, pannello a fianco a 1180 (confronto con ingresso-docs.png), pannello sovrapposto a 390, errore pagina
- log dell'evidence Playwright; nuova esecuzione dell'evidence del ciclo 2b

## Risks

- **Memoria.** File fino a 25 MB e pdf.js: si carica solo la pagina selezionata e al massimo 2 PDF aperti, come in `ImportSourceCache`.
- **Larghezza.** Tre colonne a 1180 sono strette per la scheda: se non ci stanno, il pannello resta sovrapposto sotto la larghezza utile. Si misura e si documenta.
- **Numero di pagina.** "L1 · p. N" arriva solo con il ciclo 3c. Fino ad allora il chip mostra solo la lettera, senza promettere una pagina.

## Gate Status

READY FOR IMPLEMENTATION
