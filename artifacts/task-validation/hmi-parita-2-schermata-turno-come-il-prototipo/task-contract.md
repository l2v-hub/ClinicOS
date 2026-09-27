# Task Contract

## Task

- Title: HMI parità 2: schermata Turno come il prototipo
- Slug: hmi-parita-2-schermata-turno-come-il-prototipo
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

La dashboard operatore (voce "Turno") è diversa dal prototipo HMI 1 (artifacts/hmi-parity/proto/turno.png):

- titolo "Benvenuto, …" e pulsante "Pazienti" in alto;
- barra "N allarmi da gestire" a tutta larghezza;
- indicatori con icona, freccia e riga di stato;
- colonne "Adesso" (coda "Da fare subito", card "Prossime terapie", consegne urgenti) e "Oggi"
  (banner del prossimo appuntamento, agenda del giorno);
- nessuna card dei pazienti.

## Expected Behaviour

Schermata come il prototipo, con i dati reali dell'app:

- **Intestazione**: "Il mio turno", sottotitolo "N ricoverati · reparto".
- **Indicatori** (5 card bianche, etichetta grigia sopra, numero 28/36 semibold; rosso per i
  critici e le terapie in ritardo, ambra per i rischi): Parametri critici, Rischi elevati, Allergie
  gravi, Ricoverati, Terapie in ritardo. Cliccabili come oggi; "—" e il motivo quando il dato non
  è disponibile.
- **Colonna sinistra (5/11): card "Adesso"** con badge rosso "N urgenti" (elementi scaduti) e il
  pulsante delle segnalazioni (stesso centro notifiche di oggi, in forma compatta). Righe come il
  prototipo: ora a sinistra (rossa se scaduta), "Letto · Paziente" in grigio, titolo in grassetto,
  pulsante a destra (primario per gli urgenti). Stessa coda, stesso ordine e stessi stati del ciclo
  "Da fare subito", più le terapie con orario da verificare. Il pulsante apre il paziente sul
  punto giusto (terapia → cartella del paziente; consegna → cartella; farmaci da verificare →
  cartella): etichetta "Apri", nessuna azione clinica diretta in questo ciclo.
- **Colonna destra (6/11)**: card "Prossimi appuntamenti" (prossimi 3 di oggi non conclusi: ora,
  motivo, paziente; pulsante "Agenda"), poi la griglia 2 colonne delle card paziente: riquadro 48
  con la camera, nome, "N anni · Letto X", badge (NEWS2 reale caricato quando la card è visibile,
  Allergia, Parametri critici, Rischio elevato, Consegne aperte), "Prossima: farmaco dose · ora"
  dalla terapia di oggi/domani o "Nessuna terapia in programma". La card apre la cartella.
- Nessun dato inventato: niente diagnosi (non disponibile nel roster), niente "Ordinate dall'AI"
  (l'ordine è a regole).
- Funzioni conservate: centro notifiche (pulsante compatto + stesso dialogo), coda con stati di
  caricamento/errore, "Aggiorna" delle scadenze terapia, accesso ad agenda, terapia e consegne. La
  card "Prossime terapie" e il blocco consegne urgenti non compaiono più sulla dashboard operatore:
  i loro contenuti sono nella coda (ritardi, consegne, orari da verificare) e nelle card paziente;
  il dettaglio completo resta nelle pagine Terapia e Consegne. La dashboard amministratore non
  cambia.

## Acceptance Criteria

- AC1: a 1180 × 820 la schermata ha la struttura del prototipo: titolo in intestazione, 5
  indicatori in riga, card "Adesso" a sinistra e a destra "Prossimi appuntamenti" + griglia pazienti
  a 2 colonne; confronto affiancato con turno.png.
- AC2: righe della coda con ora, "Letto · Paziente", titolo e pulsante (≥ 48 px); le scadute hanno
  l'ora in rosso e il pulsante primario; ordine della coda invariato (test unitari del ciclo
  precedente verdi).
- AC3: card paziente con dati reali: camera e letto, età da data di nascita, badge dal riepilogo
  clinico e NEWS2 reale (o nessun badge NEWS2 se mancano parametri completi); "Prossima" coerente con
  le terapie in programma del paziente; la card apre la cartella del paziente giusto.
- AC4: il centro notifiche si apre dal pulsante compatto con lo stesso dialogo; gli stati "non
  disponibile" di indicatori e coda sono dichiarati.
- AC5: nessuno scorrimento orizzontale a 390, 768, 1024, 1180, 1440; sotto 1024 le colonne si
  impilano; build ok; nessun nuovo test fallito rispetto alla baseline (test di contratto della
  dashboard aggiornati al nuovo disegno).

## Test Plan

| Test type                 | Required | Reason                                              |
| ------------------------- | -------: | --------------------------------------------------- |
| Unit                      |      yes | modello della card paziente (età, prossima terapia) |
| Integration               |       no |                                                     |
| API                       |       no |                                                     |
| Playwright                |      yes | struttura, dati reali delle card, stati, larghezze  |
| Persistence after refresh |       no |                                                     |
| Agnos action registry     |       no |                                                     |
| Voice simulation          |       no |                                                     |
| OCR/import test           |       no |                                                     |
| Security/privacy scan     |       no |                                                     |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; confronto affiancato prototipo/app a 1180 × 820; screenshots alle
  larghezze

## Risks

- NEWS2 per card = una lettura per paziente: caricata solo quando la card entra nello schermo.
- Le soglie della coda restano scelte di HMI da confermare.

## Gate Status

READY FOR IMPLEMENTATION
