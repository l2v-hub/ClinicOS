# Task Contract

## Task

- Title: HMI parità 3: cartella paziente come il prototipo (sezioni, intestazione, Panoramica con NEWS2)
- Slug: hmi-parita-3-cartella-paziente-come-il-prototipo-sezioni-intestazione-panoramica
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

La cartella paziente è diversa dal prototipo HMI 1 (artifacts/hmi-parity/proto/cartella-*.png):

- una card "intestazione paziente" nel contenuto (avatar, nome, CF, chip NEWS2 piccolo, Stampa e
  Invio in PS), mentre l'intestazione dell'app ha lo spazio del titolo vuoto;
- una barra con 13 voci (Anagrafica, Contatti, Presa in carico, Diagnosi, Terapia Farmacologica,
  Consegne, Parametri Vitali, Esami e consulenze, Note e visite, Diario Paziente, Moduli,
  Documenti, Dimissione) e due didascalie non cliccabili ("Ingresso", "Clinica");
- nessuna vista d'insieme: il NEWS2 è solo un chip piccolo, spesso "non calcolabile", e l'utente
  segnala di non vederlo.

## Expected Behaviour

Cartella come il prototipo, con i contenuti e le funzioni di oggi:

- **Intestazione dell'app**: nome del paziente (20/28), sotto "Camera · Letto · N anni · nato/a il
  gg/mm/aaaa"; badge rosso "Allergia: …" se ci sono allergie. La card intestazione nel contenuto non
  c'è più (la freccia indietro è quella dell'intestazione).
- **Barra delle sezioni** (bianca, sotto l'intestazione, a tutta larghezza): 8 chip da 48 px —
  Panoramica, Dati di ingresso, Clinica, Terapia, Parametri, Moduli, Documenti, Dimissione — e a
  destra "Stampa" e "Invio in PS". Nessuna didascalia non cliccabile. Chip attiva: fondo azzurro,
  bordo blu, testo blu semibold. Badge dei conteggi mantenuti.
- **Panoramica** (sezione iniziale):
  - tessere dei parametri come il prototipo: FR, SpO₂ (% aria / % O₂), PA, FC, Temp. — ultimo
    valore rilevato con unità e andamento rispetto alla rilevazione precedente ("era …" / stabile) —
    e la tessera **NEWS2**: punteggio in grande, risposta clinica, ora; colori per rischio; se l'ultima
    rilevazione completa manca, dice quali parametri mancano ("NEWS2 non calcolabile · mancano FR, O₂,
    coscienza") e resta visibile; tocco → storico NEWS2 (stesso dialogo di oggi);
  - sotto, il diario clinico (contenuto di "Diario Paziente").
- **Dati di ingresso**: Anagrafica, Contatti, Presa in carico nella stessa pagina.
- **Clinica**: Diagnosi (con sezioni cliniche), Esami e consulenze, Note e visite, Consegne nella
  stessa pagina.
- **Terapia**, **Parametri**, **Moduli**, **Documenti**, **Dimissione**: il contenuto di oggi.
- Le destinazioni esistenti (assistente, rientro dopo l'intake, moduli, link interni) aprono la
  sezione giusta e portano in vista il contenuto richiesto.
- Avvisi di sicurezza (allergie gravi, rischi, anomalie farmaci, anagrafica da completare) restano
  visibili come oggi.

## Acceptance Criteria

- AC1: a 1180 × 820 intestazione e barra delle sezioni come il prototipo: nome e dettagli
  nell'intestazione, badge allergia, 8 chip ≥ 48 px senza didascalie, Stampa e Invio in PS a
  destra; nessuna card intestazione nel contenuto.
- AC2: la Panoramica mostra le tessere di FR, SpO₂, PA, FC, Temp. e NEWS2 dai dati reali delle
  rilevazioni (valore, unità, andamento), con NEWS2 corretto (es. FR 24, SpO₂ 92 aria, PA 148, FC
  108, T 38,2, A → 6) e "non calcolabile · mancano …" quando manca un parametro; la tessera apre lo
  storico NEWS2.
- AC3: Dati di ingresso e Clinica mostrano insieme le loro parti; ogni link diretto a un tab
  esistente (profilo, contatti, presa-in-carico, diagnosi, note, consegne, esami, terapia, parametri,
  moduli, dimissione) apre la sezione giusta.
- AC4: Stampa e Invio in PS funzionano come prima; gli avvisi di sicurezza restano visibili.
- AC5: nessuno scorrimento orizzontale a 390, 768, 1024, 1180, 1440; build ok; nessun nuovo test
  fallito rispetto alla baseline (test di navigazione della cartella aggiornati al nuovo disegno).

## Test Plan

| Test type                 | Required | Reason                                                    |
| ------------------------- | -------: | --------------------------------------------------------- |
| Unit                      |      yes | modello delle tessere (valori, andamento, NEWS2), sezioni |
| Integration               |       no |                                                           |
| API                       |       no |                                                           |
| Playwright                |      yes | intestazione, sezioni, Panoramica, link, larghezze        |
| Persistence after refresh |       no |                                                           |
| Agnos action registry     |       no |                                                           |
| Voice simulation          |       no |                                                           |
| OCR/import test           |       no |                                                           |
| Security/privacy scan     |       no |                                                           |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt; confronto affiancato con proto/cartella-0-Panoramica.png

## Risks

- PatientDetail è grande: le sezioni composte rendono più tab insieme; si verifica che i link
  interni e gli stati di modifica restino coerenti.

## Gate Status

READY FOR IMPLEMENTATION
