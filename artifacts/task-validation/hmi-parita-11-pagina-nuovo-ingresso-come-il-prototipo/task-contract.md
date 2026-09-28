# Task Contract

## Task

- Title: HMI parità 11: pagina Nuovo ingresso come il prototipo
- Slug: hmi-parita-11-pagina-nuovo-ingresso-come-il-prototipo
- Type: feature
- Date: 2026-09-28

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

"Nuovo ingresso" dalla lista pazienti apre una finestra "Nuovo paziente" con due opzioni: "Da documenti" e "A mano".

Il prototipo HMI 1 (artifacts/hmi-parity/proto/ingresso-start.png) mostra invece una pagina intera "Nuovo ingresso · Scegli come arriva il paziente", con:

- tre card: "Da lettera di dimissione", "Da file del trasferimento", "A mano";
- un riquadro "Come funziona".

## Expected Behaviour

Dalla lista pazienti, "Nuovo ingresso" apre una pagina con la stessa struttura del prototipo. I percorsi restano quelli esistenti.

- **Intestazione**: "Nuovo ingresso", sottotitolo "Scegli come arriva il paziente". Un link "Torna ai pazienti" riporta all'elenco.
- **Tre card** grandi (tutte pulsanti; testi che descrivono solo ciò che l'import fa davvero):
  - **Da lettera di dimissione**: "Scansiona le pagine con la fotocamera o carica PDF e foto: l'AI propone i dati, tu li verifichi." Apre l'import documenti di oggi.
  - **Da file del trasferimento**: "Carica i PDF ricevuti dalla struttura, anche più file insieme. Puoi riordinare, rimuovere o sostituire le pagine." Apre lo stesso import.
  - **A mano**: "Inserisci anagrafica, ingresso e dati clinici passo per passo." Apre l'inserimento guidato di oggi.
  - Se il servizio AI non è disponibile, le due card documenti sono disabilitate e mostrano il motivo (come oggi). Mentre lo stato del servizio è in verifica, lo dicono.
- **Come funziona**: tre punti veri:
  - l'AI propone, l'operatore conferma;
  - pagine riordinabili e sostituibili;
  - bozza salvabile nell'inserimento a mano.
- Dal modulo appuntamento la scelta resta nella finestra di oggi: stesso componente, contesto di dialogo.

## Acceptance Criteria

- AC1: a 1180 × 820, "Nuovo ingresso" dalla lista apre la pagina con intestazione, tre card (icona, titolo, testo) e "Come funziona". La lista non è più visibile.
- AC2: le due card documenti aprono l'import documenti di oggi; "A mano" apre l'inserimento guidato di oggi; "Torna ai pazienti" riporta alla lista. Chiudere un flusso riporta alla lista.
- AC3: con il servizio AI non disponibile le card documenti sono disabilitate e mostrano il motivo; "A mano" resta disponibile. Le card sono raggiungibili da tastiera, con fuoco visibile.
- AC4: il modulo appuntamento apre ancora la scelta in finestra. Nessuno scorrimento orizzontale a 390, 768, 1024, 1180 e 1440. L'audit del design system resta tutto PASS.
- AC5: la build passa; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                                          |
| ------------------------- | -------: | ----------------------------------------------- |
| Unit                      |      yes | suite esistente                                 |
| Integration               |       no |                                                 |
| API                       |       no | nessuna API nuova                               |
| Playwright                |      yes | pagina, percorsi, AI non disponibile, larghezze |
| Persistence after refresh |       no |                                                 |
| Agnos action registry     |       no |                                                 |
| Voice simulation          |       no |                                                 |
| OCR/import test           |       no | l'import non cambia                             |
| Security/privacy scan     |       no |                                                 |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (suite completa, build)
- logs/playwright-evidence.txt; confronto con proto/ingresso-start.png

## Risks

- Le due card documenti portano allo stesso import. È dichiarato nei testi, che descrivono i due casi d'uso senza promettere comportamenti diversi.

## Gate Status

READY FOR IMPLEMENTATION
