# Task Validation Report

## Task

- Title: HMI parità 5: giro terapia come il prototipo
- Slug: hmi-parita-5-giro-terapia-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`TherapyRoundsPage.tsx`**:
  - Titolo "Giro terapia" e sottotitolo con la data. I chip delle fasce mostrano "HH:MM · fatte/totale" e sono affiancati da barra e contatore.
  - Una riga di strumenti raccoglie il filtro per stato, la data (precedente / Oggi / data / successivo) e "Ordine del giro", che apre l'ordinamento di reparto.
  - Le somministrazioni sono nella pagina, senza dialogo.
- **`TherapyGiroRows.tsx`** (nuovo): una riga per somministrazione con camera (dalla posizione attuale), nome, identificativo, farmaco, dose, via e orario.
  - Azioni "Non somm." (motivi, "Altro" con testo, "Conferma") e "Somministra".
  - Protezione dal doppio invio, che si libera a ogni nuovo stato delle fasce.
  - Badge "✓ HH:MM · operatore" (ora di Roma) e "Non somm. · motivo". In sola lettura mostra il badge "Da erogare".
- **`lib/therapyGiro.ts`** (nuovo):
  - motivi condivisi con il dialogo dell'agenda;
  - "fatte" = erogate + non erogate, dai totali esatti del server;
  - fascia iniziale = la prima con somministrazioni da fare.
- **`TherapySlotModal.tsx`**: usa i motivi condivisi. Il dialogo dell'agenda è invariato.
- **`TherapyRoundsPage.css`** (nuovo): chip e pulsanti da 48, righe come il prototipo; sotto i 720 px la riga diventa una card.

## Files Changed

- frontend/src/components/operator/TherapyRoundsPage.tsx, TherapyRoundsPage.css (nuovo),
  TherapyGiroRows.tsx (nuovo), TherapySlotModal.tsx
- frontend/src/lib/therapyGiro.ts (nuovo)
- test: components/operator/\_\_tests\_\_/therapyGiro.test.ts (nuovo)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                      |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | "Giro terapia" nell'intestazione. Chip 48 px "08:00 · 1/5", "12:00 · 0/3", "18:00 · 0/3", "20:00 · 0/0", con 08:00 scelta. Barra al 20 % e contatore 1/5. Nessun dialogo, 5 righe.                                                                                                                            |
| AC2 |   PASS | La riga mostra camera 104, nome, CF, "Enoxaparina 4000 UI", "s.c. · 08:00". Nessun campo storico (STALE-) nel DOM. La richiesta porta gli stessi campi di prima. Un doppio clic produce 1 richiesta. La riga passa a "✓ HH:MM · operatore" e il contatore a 2/5. Dopo un errore 500 la riga torna cliccabile. |
| AC3 |   PASS | "Conferma" resta disabilitato finché non si sceglie un motivo. "Altro" apre il testo. La richiesta porta motivo "altro" e la nota. La riga mostra "Non somm. · Altro".                                                                                                                                        |
| AC4 |   PASS | Fascia 12:00: 3 righe. Filtro "Erogate": 1 riga. Giorno successivo: ricarica. Caricamento parziale: avviso e "Carica altre terapie". Admin: nessun pulsante di firma, badge "Da erogare". Errore: avviso e "Riprova". Overflow 0 a 390, 768, 1024, 1180 e 1440.                                               |
| AC5 |   PASS | build.txt exit 0. unit-full.txt 861/870: i 9 fallimenti sono quelli della baseline. therapyGiro 6/6. eslint pulito sui file toccati.                                                                                                                                                                          |

## Test Results

| Test                                                       | Result | Evidence                                      |
| ---------------------------------------------------------- | -----: | --------------------------------------------- |
| Unit                                                       |   PASS | therapyGiro 6/6; suite completa (baseline)    |
| Playwright                                                 |   PASS | evidence.mjs 28/28 (logs/playwright-evidence) |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | API e persistenza invariate                   |

## QA indipendente (clinicos-qa)

- Giro 1, **FAILED VALIDATION**:
  - (1) Con la fascia ricalcolata a ogni render, un doppio clic sull'ultima riga da fare
    faceva saltare la pagina alla fascia successiva. Il secondo clic registrava così un atto
    sulla fascia sbagliata.
  - (2) Il pannello dei motivi, con il motivo già scelto, passava a un'altra fascia.
  - (3) Il fuoco andava perso dopo le azioni.
- Correzioni:
  - la fascia si fissa una volta per data;
  - le righe hanno `key` per fascia e filtro;
  - l'etichetta del pannello dice l'ora;
  - il fuoco torna su "Non somm.", sulla riga o sull'elenco.
  - A evidence.mjs sono stati aggiunti 3 casi di regressione (QA1).
- Giro 2, **READY FOR QA**:
  - sonde rieseguite: doppio clic, clic a 250 ms, 5 clic con server lento, Enter ripetuto,
    errore 500, cambio di fascia, filtro e data con il pannello aperto;
  - 28/28, 861/870 con la sola baseline.
  - Il fuoco perso con il filtro "Da erogare" è stato poi corretto: il fuoco va sull'elenco.

## Runtime Evidence

- screenshots/giro-1180.png (accanto a hmi-parity/proto/terapia.png)
- dopo-somministra.png, motivo.png, admin-sola-lettura.png
- giro-390/768/1024/1440.png

## Residual Risks

- Allergie per nome e avvisi AI nelle righe (presenti nel prototipo) non ci sono: il servizio delle
  fasce non li porta. Non si inventano.
- Dopo ogni atto la pagina ricarica la prima pagina delle fasce, come prima: con un caricamento
  parziale i dettagli aggiunti con "Carica altre terapie" vanno ricaricati.
- Su telefono il pulsante dell'assistente può coprire il bordo di "Somministra". Il pulsante sarà
  sostituito dal pannello dell'assistente in un ciclo successivo.

- "Altro" con il testo vuoto resta confermabile, come nel vecchio dialogo: è una regola clinica
  da concordare.
- Il dialogo delle fasce dell'agenda non è raggiungibile, perché App.tsx non passa le fasce
  all'agenda. Il problema esiste già su main e non è stato introdotto qui.

## Final Decision

CLOSED — VERIFIED
