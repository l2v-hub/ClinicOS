# Task Contract

## Task

- Title: Parametri vitali: frequenza respiratoria, ossigeno e coscienza ACVPU per il NEWS2
- Slug: parametri-vitali-frequenza-respiratoria-ossigeno-e-coscienza-acvpu-per-il-news2
- Type: feature
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

- **Backend/API:** `POST /patients/:id/parameter-readings` accetta tre nuove chiavi in `values`.
  La modifica è richiesta esplicitamente dall'utente, che ha scelto l'opzione "Aggiungo i 3 campi"
  per il NEWS2.
- **Database/Persistence:** nessuna modifica di schema. `PatientParameterReading.values` è JSON;
  le nuove chiavi vengono salvate lì.

## Current Behaviour

- Le rilevazioni con data e ora (`PatientParameterReading`, il modello primario usato da
  rilevazione singola, rilevazione multipaziente, storico, tabella mensile e trend) accettano solo
  `pa, spo2, fc, temperatura, dtx, evacuazione, note`.
- Il NEWS2 richiede anche frequenza respiratoria, ossigeno supplementare e coscienza (ACVPU):
  oggi non si possono registrare, quindi un NEWS2 completo non è calcolabile.

## Expected Behaviour

- Tre nuovi campi nelle rilevazioni:
  - `fr`: frequenza respiratoria, atti/min, intero plausibile 1–80;
  - `o2`: ossigeno supplementare, `si` / `no`;
  - `coscienza`: ACVPU, `A` / `C` / `V` / `P` / `U`.
- Backend e frontend li validano allo stesso modo.
- Si inseriscono dalla rilevazione singola e da quella multipaziente, con menu a scelta per `o2`
  e `coscienza`.
- Compaiono nello storico e nella tabella mensile. FR compare anche nei trend.
- Nessun valore inventato: un campo non compilato resta assente.

## Acceptance Criteria

- AC1: il backend accetta `fr` (1–80, intero), `o2` (`si`/`no`) e `coscienza` (A/C/V/P/U) e
  rifiuta valori fuori regola. Unit test su `parseParameterReading`.
- AC2: il frontend applica le stesse regole (`parameterValuesError`) e mostra i valori in forma
  leggibile ("Sì"/"No", "A · Vigile"). Unit test.
- AC3: nel browser la rilevazione singola e quella multipaziente offrono i tre campi (FR testo
  numerico, O₂ e coscienza come menu), e il payload inviato contiene le chiavi corrette.
- AC4: lo storico mostra i nuovi valori di una rilevazione salvata.
- AC5: build frontend e backend passano; nessun nuovo test fallito rispetto alla baseline
  (frontend e backend).

## Test Plan

| Test type                 | Required | Reason                                                                    |
| ------------------------- | -------: | ------------------------------------------------------------------------- |
| Unit                      |      yes | validazione backend e frontend, formattazione                             |
| Integration               |       no | nessun Postgres locale: la persistenza JSON non cambia forma              |
| API                       |      yes | test di `parseParameterReading`, la validazione del corpo della richiesta |
| Playwright                |      yes | moduli di inserimento e storico (stub API + page.route)                   |
| Persistence after refresh |       no | nessun DB locale; limite dichiarato                                       |
| Agnos action registry     |       no |                                                                           |
| Voice simulation          |       no | il vocale scrive un altro modello (parametriVitali), fuori scope          |
| OCR/import test           |       no |                                                                           |
| Security/privacy scan     |       no |                                                                           |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit backend e frontend, build, suite completa)
- logs/playwright-evidence.txt, screenshots dei moduli e dello storico

## Risks

- Il deploy del backend su Railway è automatico al merge: le nuove chiavi sono solo additive, e i
  client vecchi continuano a funzionare.
- La tabella multipaziente ha colonne fisse in CSS: vanno aggiornate senza scorrimento
  orizzontale sul tablet.
- Soglie cliniche: qui si tratta solo di plausibilità (1–80). Le soglie NEWS2 arrivano nel ciclo
  6b e vanno validate dal direttore sanitario.

## Gate Status

READY FOR IMPLEMENTATION
