# Task Contract

## Task

- Title: CRUD color-coded sweep tutte le schermate
- Slug: crud-color-coded-sweep-tutte-le-schermate
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

La convenzione color-coded (`.btn-success` verde Crea/Salva, `.icon-btn--edit` blu Modifica,
`.btn-danger` rosso Elimina) esiste ma è applicata solo alla flagship Posti Letto. Sulle altre
schermate CRUD i bottoni Crea/Salva usano ancora `.btn-primary` (blu).

## Expected Behaviour

- Tutti i bottoni **Crea/Salva** (Nuovo/Nuova/Crea/Aggiungi/Salva/Registra + IcoPlus/IcoCheck/IcoSave)
  usano `.btn-success` (verde) su tutte le schermate CRUD.
- Le matite **Modifica** (icon-btn con IcoEdit / title "Modifica") usano `.icon-btn--edit` (blu).
- I bottoni NON create/save restano invariati: navigazione ("Vai a", "Avanti", "Chiudi", "Torna"),
  stampa, Invio in PS, azioni AI (send/execute), import (Applica/Elabora), toggle attivo/inattivo
  (selettori stato), camera.
- Solo classi CSS; nessun cambio a layout/spaziatura/palette/API. Build verde.

## Acceptance Criteria

- AC1: i bottoni Crea/Salva delle schermate CRUD sono `.btn-success` (verde); i non-create/save restano blu.
- AC2: le matite Modifica hanno `.icon-btn--edit` (blu).
- AC3: nessun toggle/selettore-stato, nav, stampa, AI, import erroneamente reso verde.
- AC4: `npm run build -w frontend` verde; `tsc --noEmit` 0 errori.

## Test Plan

| Test type                 | Required | Reason                                                                                 |
| ------------------------- | -------: | -------------------------------------------------------------------------------------- |
| Unit                      |       no | Solo classi/colori                                                                     |
| Integration               |       no | Nessun flusso nuovo                                                                    |
| API                       |       no | Nessun endpoint                                                                        |
| Playwright                |      yes | Spot-check computed-color su 2-3 schermate (Consegne, Lista pazienti, un tab cartella) |
| Persistence after refresh |       no | Nessun dato modificato                                                                 |
| Agnos action registry     |       no | Non impattato                                                                          |
| Voice simulation          |       no | Non impattato                                                                          |
| OCR/import test           |       no | Non impattato                                                                          |
| Security/privacy scan     |       no | Solo presentazione                                                                     |

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

- Rischio di rendere verde un bottone non-create/save (toggle stato, nav, AI, import): mitigazione — classificazione esplicita per file:line, edit mirati, no replace_all su file con più btn-primary di tipo diverso.
- Molti file toccati → prettier li normalizza al primo tocco (diff più ampi, atteso). Nessun cambio logico.

## Gate Status

READY FOR IMPLEMENTATION
