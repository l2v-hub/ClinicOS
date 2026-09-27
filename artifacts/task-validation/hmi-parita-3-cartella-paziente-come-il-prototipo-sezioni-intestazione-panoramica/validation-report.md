# Task Validation Report

## Task

- Title: HMI parità 3: cartella paziente come il prototipo (sezioni, intestazione, Panoramica con NEWS2)
- Slug: hmi-parita-3-cartella-paziente-come-il-prototipo-sezioni-intestazione-panoramica
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`tabGroups.ts`**: `CHART_SECTIONS` (8 sezioni del prototipo) e `chartSectionOf(tab)`; nuovo tab
  `panoramica`, predefinito all'apertura (`resolvePatientTab()`); i TabId esistenti restano le
  destinazioni dei link diretti e aprono la sezione che li contiene.
- **`PatientDetail.tsx`**:
  - titolo del paziente nell'intestazione dell'app (portal): "Cognome, Nome", badge "Allergia: …",
    "Camera · Letto · N anni · nato/a il …"; la card intestazione nel contenuto non è più montata;
  - barra delle sezioni bianca a tutta larghezza, 8 chip (`TopNav` variante `top-nav--chips`), senza
    didascalie; Stampa e Invio in PS a destra (quadrati 48 a sola icona sotto i 1400 px);
  - contenuti per sezione: ogni sezione mostra insieme le sue parti (`renderTab(current)`); Dati di
    ingresso = Anagrafica + Contatti + Presa in carico; Clinica = Diagnosi (con allergie, anamnesi e
    sezioni cliniche) + Esami e consulenze + Note e visite + Consegne; Moduli invariato;
  - Panoramica: tessere dei parametri e NEWS2, poi il diario (con i filtri per autore) a tutta
    larghezza; il vecchio quadro operativo (dati legacy in contrasto con tessere e terapia) è stato
    rimosso;
  - moduli già aperti (Medicazioni, Contenzioni, Braden) in un punto fisso della pagina: le bozze
    non si perdono cambiando sezione;
  - un link a una parte non in cima alla sezione la porta in vista.
- **`lib/patientVitalsOverview.ts`** (nuovo): ultimo valore per parametro con andamento e colore dal
  punteggio NEWS2 del parametro; tessera NEWS2 (ultima rilevazione completa, risposta, ora, "da
  aggiornare"; se non calcolabile, i parametri mancanti).
- **`News2Chip.tsx`**: variante `overview` (tessere) con lo stesso caricamento, aggiornamento al
  salvataggio e storico NEWS2.
- **`App.tsx`**: la sezione predefinita della cronologia è la Panoramica.
- **CSS**: chip, barra delle sezioni, titolo del paziente, tessere, impaginazione della Panoramica.

## Files Changed

- frontend/src/components/operator/tabGroups.ts, PatientDetail.tsx, News2Chip.tsx, News2.css
- frontend/src/components/navigation/TopNav.css, frontend/src/app-additions.css, frontend/src/App.tsx
- frontend/src/lib/patientVitalsOverview.ts (nuovo)
- test: patientVitalsOverview.test.ts (nuovo), patientChartNavigation.test.ts,
  patientDetailWorkspace.test.ts, patientRecordPrint.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                               |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | "Moretti, Andrea" + "Camera 104 · Letto B · 79 anni · nata il 17/08/1947" e badge allergia nell'intestazione; 8 chip ≥ 48 nell'ordine del prototipo, tutte visibili, 0 didascalie; barra a x=96 y=72 larga 1084; Stampa e Invio in PS 48×48; nessuna card intestazione; Panoramica attiva all'apertura |
| AC2 |   PASS | FR 24 atti/min era 20 · SpO₂ 92 % aria era 94 · PA 148/86 era 142/80 · FC 108 era 92 · Temp. 38,2 era 37,4 · NEWS2 6 punti "Valutazione medica urgente"; la tessera apre lo storico; con rilevazione incompleta "Non calcolabile · Mancano FR, O₂, Coscienza"; unit 4/4                                |
| AC3 |   PASS | Dati di ingresso = profilo, contatti, presa-in-carico; Clinica = diagnosi, esami-consulenze, note, consegne; Terapia/Parametri/Moduli/Documenti/Dimissione con contenuto; l'avviso anomalie "Vai alla terapia" apre Terapia; unit: ogni TabId → sezione giusta, nessun tab in due sezioni              |
| AC4 |   PASS | Stampa apre la finestra di selezione ("Tutte le sezioni"); Invio in PS apre il modulo; fascia allergie e badge nell'intestazione presenti                                                                                                                                                              |
| AC5 |   PASS | overflow 0 a 390/768/1024/1180/1440 con le 6 tessere; build.txt exit 0; unit-full.txt con i soli 9 fallimenti della baseline                                                                                                                                                                           |

## Test Results

| Test                                                       | Result | Evidence                                     |
| ---------------------------------------------------------- | -----: | -------------------------------------------- |
| Unit                                                       |   PASS | unit-cartella.txt; suite completa (baseline) |
| Playwright                                                 |   PASS | evidence.mjs 33/33                           |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA |                                              |

## Runtime Evidence

- screenshots/panoramica-1180.png (accanto a hmi-parity/proto/cartella-0-Panoramica.png),
  dati-di-ingresso-1180.png, clinica-1180.png, news2-non-calcolabile.png, panoramica-390/768/1024/1440.png

## Independent QA

- Giro 1 FAILED VALIDATION: colonna laterale con dati legacy in contrasto (parametri, 5 farmaci
  contro 3) e editor parametri a finestra raggiungibile; bozze dei moduli perse; link "Codice
  fiscale" senza focus; nome troncato al telefono → corretti (colonna rimossa, Suspense per parte,
  priorità al nome, valori non plausibili senza andamento, titolo inline senza spazio, allergeni
  come registrati).
- Giro 2 FAILED VALIDATION: bozze ancora perse cambiando sezione; allergia non grave invisibile al
  telefono → moduli in un punto fisso; icona allergia nella riga dei dettagli con nome accessibile.
- Giro 3 READY FOR QA: bozza conservata su 8 percorsi; allergia moderata visibile a 390–1180;
  build, suite (baseline), evidence 33/33.

## Residual Risks

- Sotto i 900 px, per allergie non gravi, il nome dell'allergene è nel tooltip e nel nome
  accessibile dell'icona (le allergie gravi hanno anche la fascia con il nome).
- `PatientCompactHeader.tsx` non è più montato (codice morto da rimuovere in un ciclo di pulizia).

- Gli avvisi di sicurezza (anagrafica da completare, allergie gravi, rischi, anomalie farmaci)
  restano sopra i contenuti come oggi: il prototipo non li ha, ma sono informazioni di sicurezza.
- Il diario e i contenuti delle singole sezioni hanno ancora lo stile di oggi: vengono portati al
  prototipo nei cicli successivi (diario clinico con filtri per tipo, card "Dati di ingresso",
  "Clinica", parametri, terapia).
- La colonna laterale della Panoramica mostra il quadro operativo esistente, non le card
  "Sintesi AI / Da completare / Terapia di oggi" del prototipo (l'app non ha una sintesi AI).

## Final Decision

CLOSED — VERIFIED
