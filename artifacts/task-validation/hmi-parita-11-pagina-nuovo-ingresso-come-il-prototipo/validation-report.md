# Task Validation Report

## Task

- Title: HMI parità 11: pagina Nuovo ingresso come il prototipo
- Slug: hmi-parita-11-pagina-nuovo-ingresso-come-il-prototipo
- Commit: (vedi PR)
- Date: 2026-09-28

## Implementation Summary

- **`NewPatientStart.tsx`** (nuovo): la pagina "Nuovo ingresso · Scegli come arriva il paziente".
  - Link "← Torna ai pazienti".
  - Tre card di scelta, ognuna con icona, titolo e testo:
    - "Da lettera di dimissione" e "Da file del trasferimento" portano all'import documenti di oggi. I testi dicono solo ciò che l'import fa davvero: fotocamera, PDF e foto, più file insieme, riordino, rimozione e sostituzione delle pagine.
    - "A mano" porta all'inserimento guidato di oggi.
  - Con il servizio AI non disponibile, le due card documenti sono disabilitate e mostrano il motivo; mentre il servizio è in verifica lo dicono.
  - Riquadro "Come funziona" con tre punti veri.
- **`NewPatientStart.css`** (nuovo): token del design system. Le card sono un componente dichiarato nell'audit del design system. Sotto i 1024 px vanno su una colonna.
- **`PatientList.tsx`**: "Nuovo ingresso" apre la pagina al posto dell'elenco. La scelta apre il flusso scelto nella sua finestra di sempre; chiudere il flusso riporta alla lista.
- **`NewPatientFlow.tsx`**: nuovo `initialPath`. Con il percorso già scelto non mostra la finestra di scelta; dal modulo appuntamento la scelta resta in finestra.
- **`icons.tsx`**: aggiunte `IcoCamera` e `IcoUpload` (stesso stile a tratto).
- **Test**: `importLandsOnPatient` aggiornato al nuovo percorso (pagina → flusso). L'atterraggio sul paziente creato e il ricaricamento dopo un import non cambiano.

## Files Changed

- frontend/src/components/operator/NewPatientStart.tsx (nuovo), NewPatientStart.css (nuovo), PatientList.tsx, NewPatientFlow.tsx
- frontend/src/icons.tsx, frontend/src/types.ts (NavKey nuovo-ingresso), frontend/src/App.tsx, components/shared/TeamsLikeSidebar.tsx
- test: lib/\_\_tests\_\_/importLandsOnPatient.test.ts
- artifacts: ds-audit.mjs del design system (card Nuovo ingresso dichiarate, intake aperto dalla nuova pagina)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                      |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | "Nuovo ingresso · Scegli come arriva il paziente". Tre card con icona, titolo e testo nell'ordine del prototipo. "Come funziona" con tre punti. La lista non è visibile.                                                      |
| AC2 |   PASS | "Da lettera di dimissione" e "Da file del trasferimento" aprono "Importa lettere di dimissione". "A mano" apre l'inserimento guidato (footer dell'intake). "Torna ai pazienti" e la chiusura del flusso riportano alla lista. |
| AC3 |   PASS | AI non disponibile: le card documenti sono disabilitate con "Servizio AI non disponibile: …", "A mano" resta disponibile. Da tastiera il fuoco (Tab) raggiunge la card, con outline di 3 px.                                  |
| AC4 |   PASS | Dal modulo appuntamento, "Crea nuovo paziente" apre ancora la finestra "Nuovo paziente". Nessun overflow a 390, 768, 1024, 1180 e 1440. Audit del design system: 13/13 su 96 stati pagina.                                    |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 881/890 con i soli 9 fallimenti della baseline.                                                                                                                                               |

## Test Results

| Test                                                       | Result | Evidence                            |
| ---------------------------------------------------------- | -----: | ----------------------------------- |
| Unit                                                       |   PASS | suite completa (baseline)           |
| Playwright                                                 |   PASS | evidence.mjs 19/19; ds-audit 13/13  |
| Integration, API, Persistence, Agnos, Voice, OCR, Security |     NA | nessuna API nuova; import invariato |

## Runtime Evidence

- screenshots/nuovo-ingresso-1180.png (accanto a hmi-parity/proto/ingresso-start.png), ai-non-disponibile.png,
  import-da-lettera.png, nuovo-ingresso-390/768/1024/1440.png; logs/ds-audit.txt

## Independent QA

- Primo giro (clinicos-qa): READY FOR QA con avvisi: (1) la freccia dell'intestazione portava alla Dashboard, saltando la lista; (2) la voce Pazienti della sidebar non chiudeva la pagina; (3) fuoco perso sul body all'apertura e al ritorno; (4) colori esadecimali; (5) motivo "AI non disponibile" poco contrastato; (6) "riprendere dopo" vero solo nella sessione.
- Correzioni: Nuovo ingresso è una voce di navigazione (#/nuovo-ingresso, NAV_FALLBACK pazienti, sidebar su Pazienti) con la lista sempre montata sotto; fuoco sulla pagina all'apertura e su "Nuovo ingresso" a ogni uscita; token --purple/--ds-radius; opacità solo su icona/titolo/testo; testo "in questa sessione". Quattro check nuovi nelle evidenze.
- Secondo giro (clinicos-qa): READY FOR QA. Freccia, indietro del browser, sidebar, flusso chiuso, atterraggio dopo la creazione, admin (nessun accesso), tastiera e drawer a 390: tutti PASS. Test di navigazione verdi. Nota applicata: role="region" sul contenitore etichettato.

## Residual Risks

- Con un flusso aperto sopra la lista, "avanti" del browser torna alla pagina Nuovo ingresso e la finestra si nasconde; "indietro" la ripresenta (stato conservato, dati salvati dal server).

- Le due card documenti aprono lo stesso import. Il prototipo le distingue come casi d'uso e i testi lo dichiarano senza promettere comportamenti diversi.
- Il prototipo continua con una scheda unica (indice a sinistra, documento a fianco). L'inserimento resta quello di oggi, a passi: il ridisegno è un ciclo successivo.
- Nello stub l'import non va oltre l'apertura, perché l'endpoint dei job non è simulato.

## Final Decision

CLOSED — VERIFIED
