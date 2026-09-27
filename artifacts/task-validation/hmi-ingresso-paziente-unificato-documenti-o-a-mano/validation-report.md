# Task Validation Report

## Task

- Title: HMI: ingresso paziente unificato (documenti o a mano)
- Slug: hmi-ingresso-paziente-unificato-documenti-o-a-mano
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`NewPatientChooser.tsx` / `.css` (nuovi):** dialogo "Nuovo paziente" con due opzioni grandi.
  - **Da documenti**, proposta per prima: evidenziata, con la dicitura "Il più rapido".
  - **A mano**.
  - Con il servizio AI non disponibile, "Da documenti" è disattivata e riporta il motivo.
  - Focus iniziale sulla prima opzione utilizzabile.
- **`AIImportStatus.tsx`:** lo stato del servizio AI è estratto nell'hook `useAiImportStatus`,
  condiviso dal pulsante "Importa dimissione" e dalla scelta. Il comportamento del pulsante non
  cambia.
- **`PatientList.tsx`:**
  - "Nuovo paziente" e "Aggiungi primo paziente" aprono la scelta;
  - "Da documenti" apre `DischargeImportModal`, "A mano" apre `IntakeWorkspace`: sono i flussi
    esistenti, non modificati;
  - l'arrivo dopo la creazione passa da un solo `handleImported`, usato sia dal pulsante di import
    sia dalla scelta;
  - "Importa dimissione" resta come scorciatoia.
- Nessun cambiamento a import, wizard, dati o API.

## Files Changed

- frontend/src/components/operator/NewPatientChooser.tsx (nuovo)
- frontend/src/components/operator/NewPatientChooser.css (nuovo)
- frontend/src/components/operator/PatientList.tsx
- frontend/src/components/shared/AIImportStatus.tsx
- frontend/src/components/shared/useAiImportStatus.ts (nuovo)
- frontend/src/components/operator/**tests**/newPatientChooser.test.ts (nuovo)
- frontend/src/lib/**tests**/importLandsOnPatient.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                  |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | playwright-evidence: dialogo con titolo; focus iniziale su "Da documenti" a 1280/768/390; Esc chiude e il focus torna su "Nuovo paziente". Unit: role dialog, aria-modal, aria-labelledby |
| AC2 |   PASS | "Da documenti" apre "Importa lettere di dimissione"; "A mano" apre il wizard su "Anagrafica · Passaggio 1 di 5"                                                                           |
| AC3 |   PASS | AI non disponibile: "Da documenti" disattivata con "Servizio AI non disponibile: chiave non configurata"; focus su "A mano", che apre il wizard                                           |
| AC4 |   PASS | importLandsOnPatient.test.ts: `handleImported` inoltra (patientId, moduleTabId) e serve entrambi i punti di import; il ramo manuale inoltra onCreated come prima                          |
| AC5 |   PASS | opzioni alte 102–145 px; nessuno scorrimento aggiunto a 1280/768/390. A 768 px la pagina sfora già di 30 px per la barra superiore (preesistente); la scelta non aggiunge nulla           |
| AC6 |   PASS | build.txt exit 0; unit-full.txt 833/842, stessi 9 fallimenti della baseline (829/838 + 4 test nuovi)                                                                                      |

## Test Results

| Test             | Result | Evidence                                                        |
| ---------------- | -----: | --------------------------------------------------------------- |
| Unit             |   PASS | newPatientChooser.test.ts 3/3, importLandsOnPatient.test.ts 4/4 |
| Integration      |     NA |                                                                 |
| API              |     NA |                                                                 |
| Playwright       |   PASS | evidence.mjs 18/18                                              |
| Persistence      |     NA |                                                                 |
| Agnos AI         |     NA |                                                                 |
| Voice            |     NA |                                                                 |
| OCR              |     NA | flusso di import invariato; cambia solo l'accesso               |
| Security/privacy |     NA |                                                                 |

## Runtime Evidence

- screenshots/scelta-1280.png, scelta-768.png, scelta-390.png, scelta-ai-non-disponibile.png,
  da-documenti.png, a-mano.png

## Independent QA

- READY FOR QA: build, suite 833/842 (baseline), evidence.mjs 18/18 e probe indipendente 22/22:
  - trappola del focus con Tab e Shift+Tab, con AI attiva e non disponibile;
  - chiusura con clic sullo sfondo e con X, che misura 48×48;
  - stato AI lento (3 s) senza furto del focus;
  - lista vuota → "Aggiungi primo paziente";
  - nessun dialogo residuo dopo l'import;
  - larghezze 390, 768 e 1024.
- Due avvisi lint, corretti dopo la QA:
  - l'hook è spostato in `shared/useAiImportStatus.ts` (react-refresh/only-export-components);
  - il timestamp di apertura usa `useState(() => Date.now())` (react-hooks/purity).
- Dopo le correzioni sono stati rieseguiti eslint sui file toccati (0 errori), build, suite
  833/842 ed evidence 18/18.

## Residual Risks

- L'inserimento a mano richiede un clic in più (scelta, poi "A mano").
- La creazione dall'agenda ("Crea nuovo paziente" nel modulo appuntamento) apre ancora
  direttamente il wizard manuale e dopo la creazione non seleziona il paziente. È da allineare in
  un ciclo successivo.
- I 30 px di scorrimento orizzontale a 768 px (barra superiore) sono preesistenti e restano aperti.

## Final Decision

CLOSED — VERIFIED
