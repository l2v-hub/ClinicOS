# Task Validation Report

## Task

- Title: Ingresso 3a: pannello documento a fianco e provenienza per lettera
- Slug: ingresso-3a-pannello-documento-a-fianco-e-provenienza-per-lettera
- Commit: (vedi PR)
- Date: 2026-09-30

## Implementation Summary

Solo frontend. Usa gli endpoint esistenti dei job a pagine e `_fieldOrigin`, compresa la chiave facoltativa `pages` del ciclo 3b (#378). Backend e schema invariati.

- **Chip di provenienza** (`IntakeAiBadge.tsx`, `intakeAiOrigin.ts`, `intakeDocumentPages.ts`)
  - Un campo scritto dall'AI mostra un chip cliccabile: "L1", "L1 + L2", oppure "L2 · p. 1".
  - La pagina compare solo se `pages` punta a una pagina ancora presente nel manifest con lo stesso documento. In quel caso lettera e pagina vengono dalla posizione attuale della pagina, anche se è stata spostata.
  - Il chip non è cliccabile e resta "AI" quando: il job non è collegato, la lettera è sparita, oppure si è nel flusso "da documenti".
- **Pannello documento** (`IntakeDocumentPanel.tsx`)
  - Si apre dal chip o da "Vedi documenti" nella card.
  - È una terza colonna da 1180px in su (264 / 548 / 336), sotto diventa un pannello sovrapposto a tutta larghezza, con la trappola del focus.
  - Titolo "Lettera N · p. M". Le schede delle pagine usano ARIA tablist/tab/tabpanel, si muovono con frecce, Home e End, e mostrano lo stato del manifest: letta, in lettura, errore.
  - La pagina si scarica solo quando si sceglie la sua scheda, con fetch autenticato e blob (`ImportSourceCache`, `ImportPageContent`); dei PDF viene disegnata la pagina `sourcePageNumber`.
  - Esc e X chiudono solo il pannello e riportano il focus all'origine. Con un ConfirmDialog aperto, Esc chiude solo quello.
  - La cache si svuota alla chiusura, allo scollegamento e all'uscita dalla scheda; allo scollegamento il focus va su "Carica file".
- **Errori della pagina**
  - 404 e 410: messaggio dedicato, senza "Riprova".
  - 422: "Il file originale non è leggibile: rimuovilo e caricalo di nuovo.", senza "Riprova".
  - 401, 5xx e rete: messaggio con "Riprova".

## Files Changed

- frontend/src/components/shared/intake/
  - nuovi: intakeDocumentPages.ts, IntakeDocumentPanel.tsx, **tests**/intakeDocumentPages.test.ts
  - modificati: IntakeAiBadge.tsx, intakeAiOrigin.ts, IntakeWorkspace.tsx, IntakeDocumentsCard.tsx, StepAnagrafica.tsx, StepClinica.tsx, useIntakeDocuments.ts, IntakePage.css
- frontend/src/components/shared/import/: importSourceCache.ts (`ImportSourceError` con status), ImportPageView.tsx (`errorMessage` e `canRetry` facoltativi)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                  |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Chip "L1" (lettera 1) e "L2 · p. 1" (pagina registrata), entrambi pulsanti; senza job il chip è uno span "AI" (verifica QA).                                                                                                              |
| AC2 |   PASS | Il chip apre "Lettera 1 · p. 1" a fianco. L'immagine è un blob scaricato con `x-operator-id`. Le schede mostrano lo stato del manifest e lo aggiornano durante l'interrogazione. Un'altra scheda scarica solo la sua pagina.              |
| AC3 |   PASS | Esc e X chiudono il pannello, revocano i blob e riportano il focus al chip. A 390px, un clic sul titolo seguito da Esc lascia aperta la scheda. A pannello chiuso non si scaricano altre pagine.                                          |
| AC4 |   PASS | 404: messaggio senza "Riprova". 422: messaggio esatto, senza "Riprova". Nessun errore della pagina e la scheda resta utilizzabile.                                                                                                        |
| AC5 |   PASS | Terza colonna a 1180 e 1440, pannello sovrapposto a tutta larghezza a 390, 768 e 1024; nessuno scorrimento orizzontale, controlli ≥ 44px. Un PDF vero di 3 pagine si scarica una volta sola, mostra la pagina 2 e non esce dalla colonna. |
| AC6 |   PASS | Evidence 2b ancora 26/26. npm test 950: 941 passati, 9 falliti, tutti della baseline. Build ok, guardia del design system ok.                                                                                                             |
| AC7 |   PASS | Niente dati clinici né blob in storage, negli URL o in console; solo fetch autenticati.                                                                                                                                                   |

## Test Results

| Test             | Result | Evidence                                                                          |
| ---------------- | -----: | --------------------------------------------------------------------------------- |
| Unit             |   PASS | intakeDocumentPages.test.ts 14/14                                                 |
| Playwright       |   PASS | evidence.mjs 21/21 (logs/playwright-evidence.txt); regressione 2b 26/26           |
| OCR/import test  |   PASS | stato delle pagine dal manifest durante la lettura; PDF multipagina               |
| Security/privacy |   PASS | fetch autenticato, blob revocati (contati), niente dati in storage, URL o console |

## Independent QA

clinicos-qa:

- **1° giro: FAILED VALIDATION.** Due problemi bloccanti:
  - sotto 1180px Esc chiudeva anche la scheda;
  - PDF tagliato nella terza colonna.

  In più quattro avvisi: pagina spostata, errore 422, focus perso allo scollegamento, controlli dell'evidence che non verificavano nulla. Tutto corretto.

- **2° giro: READY FOR QA.** Sonde indipendenti: Esc sotto ConfirmDialog, trappola del focus (12/12), PDF di 3 pagine, lettere fuori ordine, blob a zero dopo ogni chiusura.

## Residual Risks

- "Riprova anteprima", "Scarica originale" e la barra del PDF arrivano dal componente condiviso `ImportPageContent` con la vecchia classe `btn-secondary`: sono alti 48px, da uniformare in un ciclo di design system.
- Riaprendo il pannello il file viene scaricato di nuovo (la cache si svuota alla chiusura, per scelta di privacy e memoria).
- La prova "768px" dell'evidence gira su 853px per l'allargamento già presente della lista pazienti in emulazione mobile.
- La verifica in produzione con documenti veri spetta all'utente.

## Final Decision

CLOSED — VERIFIED
