# Task Contract

## Task

- Title: HMI parità 1: guscio comune (barra laterale, intestazione, carattere) come il prototipo
- Slug: hmi-parita-1-guscio-comune-barra-laterale-intestazione-carattere-come-il-prototi
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

Rispetto al prototipo HMI 1 approvato (artifact R3bRsuw87qdJbFyYDub4RV, dispositivo 1180 × 820):

- Barra laterale: voci "Dashboard, Pazienti, Parametri, Farmaci, Consegne, Agenda, Terapia, Note,
  Assistente" (ordine ed etichette diversi), logo "C" piccolo, avatar ed "Esci" in fondo.
- Intestazione alta 64 px con campo di ricerca largo, reparto, nome e ruolo dell'utente; la freccia
  indietro è una pillola con testo.
- Ogni pagina ripete dentro il contenuto breadcrumb "ClinicOS / …" e un titolo grande.
- Carattere Public Sans.

## Expected Behaviour

Guscio identico al prototipo nella forma, senza perdere funzioni:

- **Barra laterale** 96 px: logo croce bianca su quadrato blu 48 px; voci operatore nell'ordine
  del prototipo: Turno, Pazienti, Terapia, Parametri, Consegne, Agenda, Note, Farmaci; in fondo,
  separato, "Assistente" (colore AI). Voci 80 × 64, icona 24, etichetta 14/500. Badge rossi dove
  esistono già (Note non lette). Ruolo amministratore: stesse voci di oggi, stessa forma, Assistente
  in fondo.
- **Intestazione** 72 px, bianca, bordo inferiore:
  - a sinistra: freccia indietro (quadrato 48 px, solo icona; nome della destinazione in
    aria-label e tooltip) quando c'è una pagina precedente, poi il **titolo della pagina** (20/28
    semibold) con il sottotitolo (14/20, grigio);
  - al centro: "Turno mattina/pomeriggio/notte" (grigio) e l'ora corrente in grassetto, cifre
    tabulari;
  - a destra: pulsante ricerca (quadrato 48 px, stessa ricerca globale di oggi, Ctrl+K e "/"
    invariati), stato del reparto con pallino verde, avatar 48 px con le iniziali che apre il menu
    utente (nome, ruolo, Esci).
- **Titolo pagina**: le pagine che oggi usano `PageHeader` mostrano titolo e sottotitolo
  nell'intestazione; nel contenuto restano solo le loro azioni. Niente breadcrumb.
- **Carattere**: Inter.
- Nessun contenuto, dato, azione o scorciatoia viene tolto: ricerca globale, freccia indietro con
  Alt+←, esci, drawer mobile con hamburger.

## Acceptance Criteria

- AC1: a 1180 × 820 barra laterale e intestazione hanno la forma del prototipo (misure: barra 96,
  voci 80 × 64, logo 48; intestazione 72; freccia, ricerca e avatar 48 × 48) e l'ordine delle voci
  è Turno, Pazienti, Terapia, Parametri, Consegne, Agenda, Note, Farmaci, Assistente in fondo.
- AC2: su Turno, Pazienti, Terapia, Parametri, Consegne, Agenda, Note e Farmaci il titolo della
  pagina compare nell'intestazione e nel contenuto non ci sono breadcrumb né un secondo titolo;
  le azioni della pagina restano visibili e funzionanti (es. "Nuovo paziente").
- AC3: freccia indietro, ricerca (clic, Ctrl+K) ed Esci funzionano; la freccia ha aria-label
  "Indietro: <destinazione>".
- AC4: sotto i 1024 px il drawer con hamburger funziona; nessuno scorrimento orizzontale a 390,
  768, 1024, 1180, 1440.
- AC5: build ok; nessun nuovo test fallito rispetto alla baseline (i test di contratto sul
  `PageHeader` restano verdi).

## Test Plan

| Test type                 | Required | Reason                                        |
| ------------------------- | -------: | --------------------------------------------- |
| Unit                      |      yes | PageHeader: titolo inline senza slot, in slot |
| Integration               |       no |                                               |
| API                       |       no |                                               |
| Playwright                |      yes | misure, ordine, titoli, azioni, larghezze     |
| Persistence after refresh |       no |                                               |
| Agnos action registry     |       no |                                               |
| Voice simulation          |       no |                                               |
| OCR/import test           |       no |                                               |
| Security/privacy scan     |       no |                                               |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (suite completa, build)
- logs/playwright-evidence.txt; confronto affiancato prototipo / app per ogni schermata

## Risks

- Il turno (mattina 7–14, pomeriggio 14–21, notte 21–7) è ricavato dall'ora con le fasce standard
  del diario: da confermare con la struttura.
- Il prototipo mostra "Sincronizzato HH:MM": l'app non ha uno stato di sincronizzazione globale,
  quindi al suo posto resta il reparto (dato reale) con il pallino verde.

## Gate Status

READY FOR IMPLEMENTATION
