# Task Contract

## Task

- Title: HMI parità 5: giro terapia come il prototipo
- Slug: hmi-parita-5-giro-terapia-come-il-prototipo
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

La pagina Terapia ("Terapia giornaliera") è diversa dal prototipo HMI 1
(artifacts/hmi-parity/proto/terapia.png). Mostra card per fascia oraria e, al clic, un dialogo con
i pazienti raggruppati e i pulsanti "Erogata" / "Non erogata". Il prototipo mostra invece il giro
direttamente nella pagina: chip delle fasce "HH:MM · fatte/totale", barra di avanzamento e una riga
per somministrazione con camera, paziente, farmaco e le azioni "Non somm." / "Somministra".

## Expected Behaviour

"Giro terapia" come il prototipo, con i dati e le regole di oggi:

- **Intestazione**: titolo "Giro terapia", sottotitolo "Somministrazioni per fascia oraria · <data>";
  navigazione per data invariata (giorno precedente, Oggi, data, giorno successivo).
- **Fasce**: chip 48 px "HH:MM · fatte/totale" (fatte = erogate + non erogate, dai totali esatti
  del server); fascia iniziale = la prima con somministrazioni da fare, altrimenti la prima; barra di
  avanzamento e "fatte/totale" della fascia scelta. Filtro per stato (Tutte / Da erogare / Erogate /
  Non erogate) mantenuto.
- **Righe** (una per somministrazione, nell'ordine del server): riquadro 48 con la camera (dalla
  posizione attuale, mai dai campi storici), nome e identificativo (CF o data di nascita), farmaco e
  dose, "via · orario"; azioni "Non somm." (apre i motivi di oggi, "Altro" chiede il testo,
  "Conferma") e "Somministra" (primario, con la stessa protezione dal doppio invio). Righe fatte su
  fondo tenue con badge "✓ HH:MM · operatore" o "Non somm. · motivo".
- **Sola lettura (admin)**: nessuna azione di firma; badge "Da erogare".
- **Caricamento parziale**: avviso e "Carica altre terapie" come oggi; totali esatti.
- Il dialogo delle fasce resta per l'agenda (invariato). Nessuna allergia per nome e nessun avviso
  AI nelle righe: il servizio delle fasce non li porta, non si inventano.

## Acceptance Criteria

- AC1: a 1180 × 820 intestazione "Giro terapia", chip delle fasce 48 px con "HH:MM · fatte/totale"
  coerenti con i totali, barra e contatore della fascia scelta; nessun dialogo per somministrare.
- AC2: ogni riga mostra camera, paziente, identificativo, farmaco, dose, via e orario; "Somministra"
  invia la stessa richiesta di oggi (stesso paziente, terapia, fascia, data) e la riga diventa
  "✓ HH:MM · operatore"; un secondo clic non invia un secondo atto.
- AC3: "Non somm." apre i motivi; "Conferma" disabilitato finché non si sceglie un motivo; "Altro"
  chiede il testo; la richiesta porta motivo e nota; la riga mostra "Non somm. · motivo".
- AC4: admin in sola lettura senza pulsanti di firma; errore di caricamento con "Riprova";
  parziale con "Carica altre terapie"; data precedente/successiva ricarica; filtro per stato
  funziona; nessuno scorrimento orizzontale a 390, 768, 1024, 1180, 1440.
- AC5: build ok; nessun nuovo test fallito rispetto alla baseline; test nuovi per la logica delle
  fasce (conteggi, fascia iniziale).

## Test Plan

| Test type                 | Required | Reason                                        |
| ------------------------- | -------: | --------------------------------------------- |
| Unit                      |      yes | conteggi fasce, fascia iniziale, render righe |
| Integration               |       no |                                               |
| API                       |       no | nessuna modifica API                          |
| Playwright                |      yes | aspetto, azioni, richieste inviate, larghezze |
| Persistence after refresh |       no | persistenza invariata (stesse API)            |
| Agnos action registry     |       no |                                               |
| Voice simulation          |       no |                                               |
| OCR/import test           |       no |                                               |
| Security/privacy scan     |       no |                                               |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; screenshot confrontati con proto/terapia.png

## Risks

- La somministrazione passa dal dialogo alla pagina: stessa logica e stesse richieste, ma va
  verificato che il doppio clic e gli errori di rete non lascino righe bloccate.

## Gate Status

READY FOR IMPLEMENTATION
