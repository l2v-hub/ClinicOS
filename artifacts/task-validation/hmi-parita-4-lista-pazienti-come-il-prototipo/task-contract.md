# Task Contract

## Task

- Title: HMI parità 4: lista pazienti come il prototipo
- Slug: hmi-parita-4-lista-pazienti-come-il-prototipo
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

La lista pazienti è diversa dal prototipo HMI 1 (artifacts/hmi-parity/proto/pazienti.png): in alto
"Importa dimissione" e "Nuovo paziente" verde; sotto ricerca, chip sesso, chip stato ("Tutti gli
stati caricati", Ricoverato, Day Hospital, Dimesso), pannello ordine sempre aperto; tabella con
avatar a iniziali, colonna codice fiscale a sé, pillola ricovero, segnalazioni; nessun NEWS2.

## Expected Behaviour

Lista come il prototipo, con i dati e le funzioni di oggi:

- **Card "Nuovo ingresso"**: riquadro blu con icona, titolo "Nuovo ingresso", "Da lettera di
  dimissione, foto o a mano: l'AI compila i dati, tu li verifichi.", pulsante primario "Nuovo
  ingresso" (apre la scelta esistente). "Importa dimissione" resta come scorciatoia secondaria.
- **Card elenco**: ricerca a tutta larghezza (48 px) "Cerca per nome o codice fiscale"; chip
  "Ricoverati" (in carico: ricoverato, day hospital o stato non ancora noto), "Dimessi e archivio",
  "Tutti", con i conteggi dei pazienti caricati; "Filtri e ordine" apre sesso e ordinamento
  (controlli di oggi). La ricerca mostra tutti gli stati.
- **Righe** (≥ 72 px): riquadro 48 con la camera; nome in grassetto e "N anni · CF"; stato di
  ricovero; **NEWS2** reale (caricato quando la riga è visibile); segnalazioni (allergie, critico,
  rischi, farmaci da sanare, consegne) come oggi; freccia. Intestazioni ordinabili come oggi.
- Nessuna colonna "Diagnosi": il roster non porta la diagnosi, non la si inventa.

## Acceptance Criteria

- AC1: a 1180 × 820 card "Nuovo ingresso" e card elenco come il prototipo (titolo in
  intestazione, pulsante primario blu, ricerca 48 px, chip 48 px); "Nuovo ingresso" apre la scelta.
- AC2: righe ≥ 72 px con camera, nome, età e CF, stato, NEWS2 reale (6 con rilevazione simulata),
  segnalazioni; clic sulla riga apre la cartella giusta.
- AC3: "Ricoverati" (predefinito) esclude i dimessi e include gli stati non noti; "Dimessi e
  archivio" mostra solo i dimessi; "Tutti" tutti; la ricerca passa a "Tutti"; conteggi coerenti.
- AC4: sesso e ordinamento restano disponibili in "Filtri e ordine"; ordinamento per colonna
  funziona; "Carica altri pazienti" invariato; nessuno scorrimento orizzontale a 390, 768, 1024,
  1180, 1440.
- AC5: build ok; nessun nuovo test fallito rispetto alla baseline (test della lista aggiornati).

## Test Plan

| Test type                 | Required | Reason                                   |
| ------------------------- | -------: | ---------------------------------------- |
| Unit                      |      yes | filtro "Ricoverati/Dimessi/Tutti"        |
| Integration               |       no |                                          |
| API                       |       no |                                          |
| Playwright                |      yes | aspetto, righe, filtri, NEWS2, larghezze |
| Persistence after refresh |       no |                                          |
| Agnos action registry     |       no |                                          |
| Voice simulation          |       no |                                          |
| OCR/import test           |       no |                                          |
| Security/privacy scan     |       no |                                          |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; confronto con proto/pazienti.png

## Risks

- Il filtro predefinito cambia da "Tutti" a "Ricoverati": i dimessi restano a un tocco e la
  ricerca li trova sempre.

## Gate Status

READY FOR IMPLEMENTATION
