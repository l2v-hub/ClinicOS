# Task Validation Report

## Task

- Title: HMI: nuovo paziente dall'agenda con la stessa scelta e selezione automatica
- Slug: hmi-nuovo-paziente-dall-agenda-con-la-stessa-scelta-e-selezione-automatica
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`NewPatientFlow.tsx` (nuovo):**
  - è l'ingresso unico: la scelta, poi `DischargeImportModal` oppure `IntakeWorkspace`;
  - `onDone(patientId, moduleTabId, path)`.
- **`PatientList.tsx`:** usa `NewPatientFlow`. Il comportamento non cambia:
  - la lista si ricarica dopo un import o quando non c'è un id;
  - poi si apre la cartella del paziente creato, sul modulo scelto.
- **`AppointmentForm.tsx`:**
  - "Crea nuovo paziente" apre `NewPatientFlow`;
  - a fine creazione carica il paziente (`fetchPatientById` con gli header dell'operatore) e lo
    seleziona nel campo, che viene rimontato perché mostri il nome;
  - ogni caricamento ha un numero di richiesta: una scelta a mano nel campo lo invalida, quindi una
    risposta lenta non sovrascrive mai il paziente scelto dall'operatore (correzione emersa dalla
    QA);
  - durante il caricamento mostra "Selezione del paziente creato…";
  - se il caricamento fallisce mostra un messaggio e non seleziona nulla;
  - il modulo resta aperto.
- **`OperatorAgenda.tsx` / `AdminAgenda.tsx`:**
  - tolti il wizard montato direttamente, lo stato `showNewPaziente` e la callback vuota
    `onAddPaziente`, che in `App.tsx` era `() => {}`;
  - l'agenda operatore passa l'operatore al flusso.

## Files Changed

- frontend/src/components/operator/NewPatientFlow.tsx (nuovo)
- frontend/src/components/operator/PatientList.tsx
- frontend/src/components/shared/AppointmentForm.tsx
- frontend/src/components/operator/OperatorAgenda.tsx
- frontend/src/components/admin/AdminAgenda.tsx
- frontend/src/App.tsx (rimossa la prop vuota `onAddPaziente`)
- frontend/src/lib/__tests__/importLandsOnPatient.test.ts

## Acceptance Criteria Result

| AC  | Result | Evidence |
| --- | -----: | -------- |
| AC1 |   PASS | playwright-evidence: agenda operatore e amministratore, "Crea nuovo paziente" apre la scelta Da documenti / A mano; "Da documenti" apre l'import ed Esc riporta al modulo appuntamento |
| AC2 |   PASS | wizard manuale percorso fino a "Conferma" (conferma inviata): il campo Paziente mostra il paziente creato, "Salva appuntamento" è abilitato, il modulo resta aperto, nessun altro dialogo resta aperto. Verificato anche dall'agenda amministratore |
| AC3 |   PASS | GET del paziente con esito 500: messaggio "Paziente creato, ma non è stato possibile selezionarlo…", campo vuoto, Salva disattivato |
| AC4 |   PASS | logs/regressione-lista-ciclo9.txt: evidence del ciclo 9 18/18; test di cablaggio della lista aggiornati e verdi |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 834/843, stessi 9 fallimenti della baseline |

## Test Results

| Test             | Result | Evidence |
| ---------------- | -----: | -------- |
| Unit             |   PASS | importLandsOnPatient.test.ts 5/5 |
| Integration      |     NA | |
| API              |     NA | |
| Playwright       |   PASS | evidence.mjs 14/14 (con caricamento lento e scelta a mano); regressione lista 18/18 |
| Persistence      |     NA | |
| Agnos AI         |     NA | |
| Voice            |     NA | |
| OCR              |     NA | import invariato |
| Security/privacy |     NA | |

## Runtime Evidence

- screenshots/agenda-scelta.png, agenda-paziente-selezionato.png, agenda-errore-selezione.png,
  agenda-admin-paziente-selezionato.png

## Independent QA

- Primo giro, READY FOR QA con un avviso: con un caricamento lento, la scelta a mano veniva
  sovrascritta dal paziente creato. Corretto con il numero di richiesta e lo stato di attesa.
- Secondo giro, READY FOR QA:
  - build, suite 834/843 (baseline), eslint pulito;
  - evidence 14/14; probe 34/34 e probe sulle concorrenze 16/16: scelta a mano durante il
    caricamento, rimozione del paziente, errore tardivo, doppia creazione, annulla durante il
    caricamento; POST con il pazienteId corretto.

## Residual Risks

- Se l'operatore scrive nel campo senza scegliere un risultato mentre il paziente creato si carica,
  all'arrivo il paziente creato sostituisce il testo digitato. Nessuna scelta era stata fatta, quindi
  è il comportamento atteso.

- La conferma del wizard nel browser è simulata con page.route (bozze intake). Il wizard reale è
  percorso passo per passo, e il paziente selezionato è un paziente reale dello stub API.
- L'agenda amministratore non passa un operatore al flusso, come già avveniva prima.

## Final Decision

CLOSED — VERIFIED
