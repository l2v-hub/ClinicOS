# Task Validation Report

## Task

- Title: HMI parità 8: agenda come il prototipo
- Slug: hmi-parita-8-agenda-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`OperatorAgenda.tsx`**
  - **Intestazione**: il titolo è "Agenda di oggi" nella vista Giorno di oggi, altrimenti "Agenda". Il sottotitolo è "operatore · data · fasce da 30 minuti".
  - **Card del giorno**: mostra la data e il pulsante "Nuovo appuntamento", che apre lo stesso modulo di prima alla prima fascia libera (oggi: non prima dell'ora attuale). Se non ci sono fasce libere il pulsante è disabilitato e lo spiega.
  - **Fasce**: l'ora è visibile su ogni fascia.
  - **Pillole su una riga**: tipo in grassetto, paziente (link alla cartella come prima), durata, stato e urgenza.
  - Selezione, azioni, nota, fasce terapia, viste Settimana e Mese, filtro di stato e navigazione restano come prima.
- **`OperatorAgendaHmi.css`** (nuovo)
  - Gli stili valgono solo sotto `.agt-view--hmi`: l'agenda dell'admin non cambia.
  - Le fasce libere restano vuote; "+ Disponibile" compare al passaggio del mouse o al fuoco.
  - Il sottotitolo nell'intestazione sta su una riga sola; sul telefono mostra solo la data.
- **Test**: `pageHeaderAdoption` aggiornato al nuovo titolo.

## Files Changed

- frontend/src/components/operator/OperatorAgenda.tsx, OperatorAgendaHmi.css (nuovo)
- frontend/src/lib/\_\_tests\_\_/pageHeaderAdoption.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                  |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | "Agenda di oggi … fasce da 30 minuti"; card con data e "Nuovo appuntamento" da 48 px; 22 fasce dalle 08:00 alle 18:30 con l'ora; pillole su una riga (≤ 48 px) con tipo, "paziente · 30 min" e stato; fasce libere vuote a riposo                                         |
| AC2 |   PASS | Il clic sulla pillola la seleziona e mostra le azioni (Modifica, Elimina) e il link al paziente. Una fascia libera apre il modulo alla sua ora (08:30 → 08:30). "Nuovo appuntamento" su un giorno futuro apre la prima fascia libera; oggi, dopo le 18:30, è disabilitato |
| AC3 |   PASS | Il filtro "Completato" riduce le pillole da 11 a 2, tutte completate. Vista Settimana invariata, con titolo "Agenda". Il giorno successivo ha titolo "Agenda" e la sua card. In caso di errore compare "Riprova"                                                          |
| AC4 |   PASS | Nessun overflow a 390, 768, 1024, 1180 e 1440. Agenda admin senza `.agt-view--hmi`                                                                                                                                                                                        |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 865/874, con solo i 9 fallimenti della baseline                                                                                                                                                                                           |

## Test Results

| Test                                                       | Result | Evidence                  |
| ---------------------------------------------------------- | -----: | ------------------------- |
| Unit                                                       |   PASS | suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 20/20        |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | stessa API                |

## QA indipendente (clinicos-qa)

- Giro 1: **READY FOR QA**, senza bloccanti. Build ok, 865/874 con la sola baseline. Sonde eseguite con orologio fisso: tastiera, filtro con fascia occupata nascosta, oggi/domani/ieri, testo lungo, cinque larghezze. L'agenda admin, confrontata con origin/main, risulta identica al pixel a 1180 e 1440.
- Avvisi corretti dopo il giro:
  - sul telefono la data è troncata con i puntini e l'operatore compare nella card del giorno;
  - "Nuovo appuntamento" è disabilitato nei giorni passati, con spiegazione;
  - la prima fascia libera è arrotondata per eccesso (niente mezz'ora già iniziata) e ricalcolata al clic;
  - il tooltip distingue giorno passato, ore rimanenti di oggi e giornata piena.
  - Sono stati aggiunti 2 casi (QA1) a evidence.mjs.
- Restano, preesistenti: la pillola non è selezionabile da tastiera (stessa struttura di main).

## Runtime Evidence

- screenshots/agenda-1180.png (accanto a hmi-parity/proto/agenda.png)
- selezione.png, nuovo-appuntamento.png
- agenda-390/768/1024/1440.png, admin-agenda.png

## Residual Risks

- Nelle pillole non compare il letto: l'appuntamento non porta la posizione del paziente e non la si inventa.
- Le fasce terapia ("Adesso · giro terapia") non compaiono in agenda perché App.tsx non passa le fasce all'agenda. Il problema esiste già su main.

## Final Decision

CLOSED — VERIFIED
