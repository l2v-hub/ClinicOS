# Task Contract

## Task

- Title: HMI: nuovo paziente dall'agenda con la stessa scelta e selezione automatica
- Slug: hmi-nuovo-paziente-dall-agenda-con-la-stessa-scelta-e-selezione-automatica
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

- Nel modulo appuntamento (agenda operatore e agenda amministratore), "Crea nuovo paziente" apre
  direttamente il wizard manuale. Dopo la creazione:
  - il wizard si chiude e il modulo appuntamento resta senza paziente: l'operatore deve cercarlo
    a mano;
  - nell'agenda amministratore la callback è vuota (`onAddPaziente={() => {}}`);
  - il percorso "da documenti" non è offerto.
- La scelta "Nuovo paziente" (ciclo 9) vive solo nella lista pazienti.

## Expected Behaviour

- Un solo componente di ingresso, `NewPatientFlow`: scelta, poi import documenti o wizard manuale.
  È usato sia dalla lista pazienti sia dal modulo appuntamento.
- Nel modulo appuntamento, "Crea nuovo paziente" apre la stessa scelta. A fine creazione il
  paziente viene caricato e selezionato nel campo Paziente, e l'operatore resta nel modulo
  appuntamento, pronto a salvare.
- Lista pazienti: comportamento invariato. Si apre la cartella del paziente creato, sul modulo
  scelto.
- Nessun cambiamento a import, wizard, dati o API. In agenda l'import documenti usa gli stessi
  endpoint della lista.

## Acceptance Criteria

- AC1: nel modulo appuntamento "Crea nuovo paziente" apre la scelta "Nuovo paziente" (Da documenti
  / A mano).
- AC2: completando il wizard manuale dal modulo appuntamento, il campo Paziente mostra il paziente
  creato e "Salva" è abilitato. Il modulo appuntamento resta aperto.
- AC3: se il caricamento del paziente creato fallisce, il modulo resta utilizzabile e mostra un
  messaggio; nessun paziente sbagliato viene selezionato.
- AC4: lista pazienti invariata: scelta, entrambi i percorsi, arrivo sulla cartella (test di
  cablaggio ed evidence del ciclo 9 ancora verdi).
- AC5: build ok; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                                               |
| ------------------------- | -------: | ---------------------------------------------------- |
| Unit                      |      yes | cablaggio NewPatientFlow in lista e modulo           |
| Integration               |       no |                                                      |
| API                       |       no |                                                      |
| Playwright                |      yes | agenda → nuovo paziente → selezionato; errore; lista |
| Persistence after refresh |       no |                                                      |
| Agnos action registry     |       no |                                                      |
| Voice simulation          |       no |                                                      |
| OCR/import test           |       no | l'import non cambia                                  |
| Security/privacy scan     |       no |                                                      |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt, screenshots del modulo appuntamento con il paziente selezionato

## Risks

- Il campo paziente (PatientCombobox) tiene il testo della ricerca in uno stato interno: dopo la
  selezione automatica va rimontato perché mostri il nome.

## Gate Status

READY FOR IMPLEMENTATION
