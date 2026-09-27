# Task Validation Report

## Task

- Title: HMI parità 6: parametri vitali come il prototipo
- Slug: hmi-parita-6-parametri-vitali-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`MultiPatientParametri.tsx`**: caricamento, paginazione, ricerca lato server, ordine di reparto e riepiloghi protetti sono quelli di prima. Cambia solo la presentazione:
  - titolo "Parametri vitali" con sottotitolo "Rilevazione rapida con NEWS2";
  - tre colonne: pazienti, modulo, tastierino;
  - "Ordine del giro" apre l'ordinamento a richiesta;
  - l'orologio resta solo per il cambio di giorno (l'ora è già nell'intestazione).
- **`ParameterPatientPick.tsx`** (nuovo): camera, nome e "Ultimi HH:MM" dal riepilogo di oggi. Mostra "Nessuna rilevazione oggi" se non ce ne sono e "Verifica in corso…" durante il caricamento. Il NEWS2 è compatto, reale e caricato quando la riga è visibile; una bozza non salvata è segnata "Bozza".
- **`ParameterEntryPanel.tsx`** (nuovo): usa la stessa bozza (`useParameterEntryDraft`), la stessa validazione e lo stesso salvataggio della riga di tabella di prima.
  - Card FR, SpO2, PA sistolica, PA diastolica, FC, Temperatura e DTX, ognuna con "Prima: valore · ora" dall'ultima rilevazione reale.
  - Chip per ossigeno e coscienza, deselezionabili.
  - Evacuazione e nota.
  - Tastierino con virgola solo nei campi decimali, e "Campo successivo".
  - "NEWS2 in tempo reale": dà un punteggio solo con tutti e 7 i parametri, altrimenti elenca quelli che mancano.
  - "Salva parametri" con gli stati di prima: salvataggio in corso, errore, esito incerto con "Riprova" sullo stesso requestId, "Rilevazione archiviata".
- **`lib/parameterPad.ts`** (nuovo): pressione in due campi salvata come "sis/dia", cioè lo stesso valore di sempre. Contiene anche il tastierino, i valori precedenti e l'ora della struttura.
- **`News2Chip`**: nuova variante `compact` ("NEWS2 n", con testo completo in title e aria-label; bordo tratteggiato se il dato va aggiornato). **`LazyNews2`** ha la prop `compact`.
- **`ParametriVitali.css`** (nuovo): tre colonne a ≥ 1100 px, due fra 700 e 1099, una sotto i 700. Sul telefono il tastierino è nascosto: c'è già la tastiera numerica di sistema.

## Files Changed

- frontend/src/components/operator/MultiPatientParametri.tsx, ParameterEntryClock.tsx, News2Chip.tsx, News2.css, LazyNews2.tsx
- frontend/src/components/operator/ParameterEntryPanel.tsx, ParameterPatientPick.tsx, ParametriVitali.css (nuovi)
- frontend/src/lib/parameterPad.ts (nuovo); test lib/\_\_tests\_\_/parameterPad.test.ts (nuovo)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                 |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Titolo e sottotitolo nell'intestazione. La lista mostra camera 104, "Ultimi HH:MM", NEWS2 6 e la riga scelta; un paziente senza rilevazioni mostra "Nessuna rilevazione oggi". Card e valori precedenti: "Prima: 24", "148", "86", "38,2". Tastierino con 12 tasti; "Salva" disabilitato senza valori.                                   |
| AC2 |   PASS | Il tastierino scrive nel campo attivo e "Campo successivo" segue l'ordine. La virgola è rifiutata in FR. La richiesta POST contiene `pa: "148/86"`, `temperatura: "38,2"`, dtx, o2, coscienza, evacuazione e nota, più requestId e measuredAt.                                                                                           |
| AC3 |   PASS | Senza O₂ e coscienza compare "Mancano: O₂, Coscienza" e nessun punteggio. Con tutti e 7 i parametri il NEWS2 è 6 con "Valutazione medica urgente" (unit: 6).                                                                                                                                                                             |
| AC4 |   PASS | Dopo il salvataggio compaiono "Rilevazione archiviata", il modulo vuoto, "Ultimi" e "Prima" aggiornati. La bozza resta quando si cambia paziente, segnata "Bozza". Un errore 500 mostra l'errore e "Riprova" con lo stesso requestId, senza perdere il valore. La ricerca manda `q` al server. Overflow 0 a 390, 768, 1024, 1180 e 1440. |
| AC5 |   PASS | Build ok. Unit-full: 864/873, con i soli 9 fallimenti della baseline. parameterPad: 5/5.                                                                                                                                                                                                                                                 |

## Test Results

| Test                                                       | Result | Evidence                                    |
| ---------------------------------------------------------- | -----: | ------------------------------------------- |
| Unit                                                       |   PASS | parameterPad 5/5; suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 31/31                          |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | stessa API, stesso formato                  |

## QA indipendente (clinicos-qa)

- **Giro 1 — FAILED.** Due problemi:
  - "Prima: nessuna rilevazione" poteva essere falso, perché veniva calcolato solo sulle prime 50 rilevazioni;
  - sul tablet i nomi comparivano troncati.
  - Corretti con `previousText`, che tiene conto di `hasMore`, e con nomi interi in una colonna da 300 px.
- **Giro 2 — FAILED.** L'avviso "fuori dai risultati" finiva in fondo alla griglia. Ora sta dentro il modulo.
- **Giro 3 — FAILED.** Una PA incollata veniva troncata dal `maxLength` ("120/100" diventava "120/10").
- **Giri 4 e 5 — FAILED.** Una pulizia dell'input creava valori diversi da quelli inseriti ("SpO2 98" diventava 29, "37°5" diventava 375, ">600" diventava 600).
  - Correzione definitiva: nessuna pulizia. Il testo resta com'è e la validazione di sempre rifiuta ciò che non è un numero pulito. Unica eccezione: la prima "/" della sistolica divide il valore senza scartare nulla.
  - La virgola del tastierino è disattivata nei campi interi.
- **Giro 6 — READY FOR QA.** 146 prove (73 casi, sia incollati o dettati sia digitati): 0 salvataggi di un valore diverso da quello inserito. Evidence 31/31, suite con la sola baseline, sonde principali tutte OK.
- Avvisi rimasti, già presenti prima: la validazione accetta valori non plausibili (PA 120/800, FC 1080), da affrontare in un ciclo dedicato; `ParameterEntryRow.tsx` non è più usata, da togliere in un ciclo di pulizia.

## Runtime Evidence

- screenshots/parametri-1180.png (confronto con hmi-parity/proto/parametri.png), news2-tempo-reale.png,
  dopo-salva.png, parametri-390/768/1024/1440.png

## Residual Risks

- Si inserisce un paziente alla volta, non più in tabella. Le bozze restano per paziente e sono segnate nella lista.
- `ParameterEntryRow.tsx` non è più usato dalla pagina; resta per i test che lo coprono e verrà rimosso in un ciclo di pulizia.
- Le 6 prove "multi-patient" della baseline controllano il sorgente della vecchia tabella: fallivano già prima e falliscono ancora.
- L'errore eslint `set-state-in-effect` in `News2Chip.tsx` esisteva già su main.

## Final Decision

CLOSED — VERIFIED
