# Task Contract

## Task

- Title: NEWS2: chip in cartella e storico con andamento nel tempo
- Slug: news2-chip-in-cartella-e-storico-con-andamento-nel-tempo
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

Letture tramite l'endpoint esistente `GET /patients/:id/parameter-readings`. Nessuna scrittura.

## Current Behaviour

- ClinicOS non calcola il NEWS2.
- Dal ciclo 6a le rilevazioni possono contenere i sette parametri necessari.

## Expected Behaviour

- **Calcolo:** NEWS2 (RCP 2017, scala SpO₂ 1) per ogni rilevazione **completa**, cioè con FR,
  SpO₂, O₂, PA, FC, coscienza e TC nella stessa rilevazione. Una rilevazione incompleta non
  mostra mai un totale: indica quali parametri mancano.
- **Chip nella testata della cartella:** "NEWS2 6 · 08:05", colorato per livello di rischio,
  riferito all'ultima rilevazione completa. Senza rilevazioni complete dice "NEWS2 non
  calcolabile", con il motivo.
- **Toccando il chip** si apre lo storico:
  - grafico del punteggio nel tempo, con le fasce di rischio;
  - elenco delle rilevazioni, con i sotto-punteggi per parametro e la risposta clinica attesa;
  - "Carica precedenti" per le pagine successive.
- **Dopo una nuova rilevazione salvata** il chip si aggiorna senza ricaricare la pagina.
- **Dichiarazione sempre visibile:** strumento di supporto, soglie RCP, scala SpO₂ 1.

## Acceptance Criteria

- AC1: `lib/news2.ts` implementa le soglie RCP per i sette parametri (unit test su tutti i
  confini di fascia) e non restituisce un rischio per rilevazioni incomplete.
- AC2: il chip mostra punteggio, ora e colore dell'ultima rilevazione completa, oppure "non
  calcolabile" con i parametri mancanti.
- AC3: lo storico mostra l'andamento (grafico) e l'elenco con sotto-punteggi. Le rilevazioni
  incomplete compaiono come incomplete, senza totale.
- AC4: salvando una nuova rilevazione completa dalla cartella, il chip si aggiorna.
- AC5: build ok; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                                                          |
| ------------------------- | -------: | --------------------------------------------------------------- |
| Unit                      |      yes | soglie NEWS2, completezza, costruzione dello storico            |
| Integration               |       no |                                                                 |
| API                       |       no | endpoint esistente in sola lettura                              |
| Playwright                |      yes | chip, apertura dello storico, aggiornamento dopo il salvataggio |
| Persistence after refresh |       no | lettura                                                         |
| Agnos action registry     |       no |                                                                 |
| Voice simulation          |       no |                                                                 |
| OCR/import test           |       no |                                                                 |
| Security/privacy scan     |       no |                                                                 |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt, screenshots del chip e dello storico

## Risks

- **Rischio clinico:** un punteggio sbagliato può rassicurare a torto.
  - Mitigazioni: test su ogni confine, nessun totale se incompleto, dichiarazione visibile.
  - L'adozione delle soglie va validata dal direttore sanitario.
- **Scala SpO₂ 2** (BPCO con target 88–92%) non gestita: dichiarata nello storico.

## Gate Status

READY FOR IMPLEMENTATION
