# Task Contract

## Task

- Title: CRUD azioni color-coded convenzione e flagship camere
- Slug: crud-azioni-color-coded-convenzione-e-flagship-camere
- Type: feature
- Date: 2026-07-19

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

I bottoni azione non hanno una convenzione cromatica coerente per Crea/Salva vs Modifica vs Elimina:
il salvataggio usa `.btn-primary` (blu), la creazione idem. Manca il verde semantico per Crea/Salva
(pur esistendo `--emerald`, già usato da `.icon-btn--success`). Delete è già rosso + ConfirmDialog.

## Expected Behaviour

- Convenzione condivisa con **token esistenti** (nessuna aggiunta di palette): Crea/Salva = verde
  (`--emerald`, nuova classe `.btn-success`), Elimina = rosso (`.btn-danger`, già presente),
  primario/Modifica = blu. Tutti con `:hover`/`:focus-visible`/transizioni coerenti.
- Applicata alla schermata flagship **Posti Letto** (`RoomsManagement`): "Nuova camera" + "Crea camera"
  verdi, matita Modifica con accento blu, Elimina rosso. Nessun cambio a layout/spaziatura/radius.
- Build verde. Le altre schermate seguiranno in un rollout successivo dopo sign-off visivo.

## Acceptance Criteria

- AC1: esiste `.btn-success` (verde `--emerald`, stessa forma di `.btn-primary`) + `:focus-visible`; nessun nuovo token di palette.
- AC2: in Posti Letto, "Nuova camera" e "Crea camera" sono verdi; Elimina resta rosso; Modifica ha accento blu.
- AC3: nessun cambio a layout/spaziatura/radius/API; solo classi/colori con token esistenti.
- AC4: `npm run build -w frontend` verde; 0 errori console.

## Test Plan

| Test type                 | Required | Reason                                                                                  |
| ------------------------- | -------: | --------------------------------------------------------------------------------------- |
| Unit                      |       no | Solo stile/classi                                                                       |
| Integration               |       no | Nessun flusso nuovo                                                                     |
| API                       |       no | Nessun endpoint                                                                         |
| Playwright                |      yes | Screenshot Posti Letto: create/save verdi, edit blu, delete rosso; computed color check |
| Persistence after refresh |       no | Nessun dato modificato dalla convenzione                                                |
| Agnos action registry     |       no | Non impattato                                                                           |
| Voice simulation          |       no | Non impattato                                                                           |
| OCR/import test           |       no | Non impattato                                                                           |
| Security/privacy scan     |       no | Solo presentazione                                                                      |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

- "Stesso feeling": il verde per Salva/Crea cambia la percezione. Mitigazione — riuso `--emerald` già presente e già usato per azioni positive (`.icon-btn--success`), nessun nuovo colore; radius/spaziatura invariati.
- Scope: applicato solo alla flagship Posti Letto; rollout alle altre schermate dopo sign-off.

## Gate Status

READY FOR IMPLEMENTATION
