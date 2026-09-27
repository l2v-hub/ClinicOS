# Task Contract

## Task

- Title: HMI parità 9: note e messaggi come il prototipo
- Slug: hmi-parita-9-note-e-messaggi-come-il-prototipo
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

"Note e messaggi" non corrisponde al prototipo HMI 1 (artifacts/hmi-parity/proto/note.png).

- Il sottotitolo "N non lette" è in rosso.
- "Nuova nota" è un pulsante verde isolato.
- Ricerca e filtri stanno fuori da qualsiasi card.
- Ogni nota è una card alta con bordo colorato, badge di priorità sempre presente, stato "LETTA/NON LETTA" e azioni in fondo.

Il prototipo invece ha:

- una card "Messaggi" con "Nuova nota" primario;
- righe compatte con avatar a iniziali, puntino per le non lette, "autore · ruolo", testo e ora a destra.

## Expected Behaviour

Note come nel prototipo, con i dati e le funzioni di oggi.

- **Intestazione**: "Note e messaggi", sottotitolo "N da leggere" oppure "Tutte lette" (testo neutro).
- **Card "Messaggi"**:
  - intestazione con "Nuova nota" (primario, 48 px), che apre il modulo esistente sotto l'intestazione;
  - ricerca e filtri Tutte/Ricevute/Inviate/Non lette nella card.
- **Righe**:
  - avatar a iniziali dell'autore e puntino blu con testo per screen reader "Non letta";
  - autore, "→ destinatario", paziente se presente;
  - priorità mostrata solo se Alta o Urgente;
  - ora a destra;
  - messaggio modificabile come oggi (solo autore o admin);
  - "Segna come letta" e "Segna come risolta" come oggi;
  - "Risolta" indicata.
- "Carica altri messaggi", errore con "Riprova" e stato vuoto restano.

## Acceptance Criteria

- AC1: a 1180 × 820 intestazione e card "Messaggi" con "Nuova nota" 48 px; righe compatte con avatar, puntino per le non lette, autore → destinatario, testo, ora.
- AC2: "Nuova nota" apre il modulo; "Segna come letta" cambia stato (richiesta di oggi); "Segna come risolta" come oggi; la modifica del testo resta limitata ad autore o admin.
- AC3: filtri e ricerca inviano la stessa query; "Carica altri" funziona; errore con "Riprova"; nessuna nota urgente perde l'indicazione di urgenza.
- AC4: nessuno scorrimento orizzontale a 390, 768, 1024, 1180 e 1440.
- AC5: la build passa; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                             |
| ------------------------- | -------: | ---------------------------------- |
| Unit                      |      yes | test note esistenti                |
| Integration               |       no |                                    |
| API                       |       no | stessa API                         |
| Playwright                |      yes | aspetto, azioni, filtri, larghezze |
| Persistence after refresh |       no |                                    |
| Agnos action registry     |       no |                                    |
| Voice simulation          |       no |                                    |
| OCR/import test           |       no |                                    |
| Security/privacy scan     |       no |                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (suite completa, build)
- logs/playwright-evidence.txt; confronto con proto/note.png

## Risks

- Le note normali non mostrano più il badge "Normale". Le urgenti restano evidenti.

## Gate Status

READY FOR IMPLEMENTATION
