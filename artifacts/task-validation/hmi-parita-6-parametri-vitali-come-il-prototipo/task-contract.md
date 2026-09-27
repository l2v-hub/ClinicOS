# Task Contract

## Task

- Title: HMI parità 6: parametri vitali come il prototipo
- Slug: hmi-parita-6-parametri-vitali-come-il-prototipo
- Type: feature
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

"Registrazione parametri" is a multi-patient table: one row per patient with inputs for PA,
SpO₂, O₂, FC, FR, TC, ACVPU, DTX, Evacuazione, Note and Salva. Above it sit a large clock card
and the order panel, which is always open. The page differs from the HMI 1 prototype
(artifacts/hmi-parity/proto/parametri.png). The prototype has three columns:

- a list of patients, each with its bed, "Ultimi HH:MM" and NEWS2;
- the selected patient, with value cards (FR, SpO2, PA sistolica, PA diastolica, FC,
  Temperatura) showing "Prima: X", plus oxygen and consciousness as chips;
- a numeric keypad, "Campo successivo", "NEWS2 in tempo reale" and "Salva parametri".

## Expected Behaviour

"Parametri vitali" as in the prototype, keeping today's data and rules. The same draft store,
validation and save (same POST, same payload) are reused.

- **Header**: title "Parametri vitali", subtitle "Rilevazione rapida con NEWS2".
- **Patient column**:
  - search by name or room, and "Ordine del giro" (collapsible order panel);
  - one row per patient: room box, name, "Ultimi HH:MM" from the day summary ("Nessuna
    rilevazione oggi" when there is none, "Verifica in corso" while loading), real NEWS2
    loaded when the row becomes visible, and a "Bozza" marker for unsaved drafts;
  - "Carica altri pazienti".
- **Selected patient**:
  - name and identifier, plus "Storico", which opens the history as it does today;
  - 48 px cards FR, SpO2, PA sistolica, PA diastolica, FC, Temperatura and DTX. Each card shows
    "Prima: value · time" from the real latest reading, or "Nessuna rilevazione precedente" /
    "Precedente non disponibile". Blood pressure is saved as today's single "sis/dia" value;
    with only one side filled in, the existing validation reports it;
  - chips for Ossigeno (In aria / Con O2) and Coscienza (A / C / V / P / U), deselectable;
  - Evacuazione (text) and Nota (text).
- **Right column**:
  - keypad 0–9, comma and delete, writing into the active field;
  - "Campo successivo";
  - "NEWS2 in tempo reale": the score and response with all 7 parameters, "Mancano: …"
    otherwise, never a partial score;
  - "Salva parametri" (primary; disabled with no values), with the states of today: saving,
    error, uncertain outcome with "Riprova", and "Rilevazione archiviata · time".
- Drafts survive switching patient and are cleared as they are today. The day changes at
  midnight as it does today.

## Acceptance Criteria

- AC1: at 1180 × 820 the page is laid out as in the prototype: title in the header, patient list
  with room, "Ultimi", NEWS2, value cards with "Prima", O2 and consciousness chips, keypad,
  "Campo successivo", live NEWS2, "Salva parametri".
- AC2: the keypad writes into the active field, "Campo successivo" moves through the fields in
  order, and the comma is allowed only in decimal fields. Blood pressure 148 + 86 is saved as
  "148/86". The POST sends the same fields and format as today.
- AC3: the live NEWS2 shows the correct total only with all 7 parameters (e.g. FR 24, SpO2 92,
  air, PA 148/86, FC 108, A, TC 38.2 → 6). Otherwise it shows the missing parameters.
- AC4:
  - a draft is kept when switching patient and the "Bozza" marker shows;
  - after saving, "Ultimi" is updated, the form empties and "Rilevazione archiviata" appears;
  - on a 500 error the error is shown with "Riprova" and no data is lost;
  - DTX, Evacuazione and Nota are saved;
  - search and "Carica altri" work;
  - no horizontal scrolling at 390, 768, 1024, 1180 or 1440.
- AC5: the build passes, and no test fails beyond the baseline. New unit tests cover blood
  pressure, the keypad and previous values.

## Test Plan

| Test type                 | Required | Reason                                         |
| ------------------------- | -------: | ---------------------------------------------- |
| Unit                      |      yes | PA sis/dia, tastierino, valori precedenti      |
| Integration               |       no |                                                |
| API                       |       no | stessa API                                     |
| Playwright                |      yes | aspetto, tastierino, NEWS2, salvataggio, bozze |
| Persistence after refresh |       no | persistenza invariata                          |
| Agnos action registry     |       no |                                                |
| Voice simulation          |       no |                                                |
| OCR/import test           |       no |                                                |
| Security/privacy scan     |       no |                                                |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, full suite, build)
- logs/playwright-evidence.txt; screenshots compared with proto/parametri.png

## Risks

- The table allowed data entry for several patients on one screen; now it is one patient at a
  time. Drafts stay per patient, so no data is lost when switching.

## Gate Status

READY FOR IMPLEMENTATION
