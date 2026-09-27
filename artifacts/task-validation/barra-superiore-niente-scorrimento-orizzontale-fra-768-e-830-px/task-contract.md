# Task Contract

## Task

- Title: Barra superiore: niente scorrimento orizzontale fra 768 e 830 px
- Slug: barra-superiore-niente-scorrimento-orizzontale-fra-768-e-830-px
- Type: bugfix
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

- Da 768 px (tablet in verticale) fino a circa 830 px, su ogni pagina con la freccia indietro
  (lista pazienti, agenda, ecc.), la barra superiore è più larga dello schermo:
  - la pagina scorre in orizzontale di circa 30 px;
  - l'utente e il reparto escono dal bordo;
  - la freccia indietro è schiacciata a 26 px e la sua etichetta sparisce.
- Causa: il pulsante di ricerca non si restringe sotto la larghezza del suo testo segnaposto
  (min-width automatico = min-content ≈ 367 px). A cedere è solo la freccia indietro.

## Expected Behaviour

- Da 768 a 1023 px la barra sta nello schermo: il pulsante di ricerca si restringe, fino alla sola
  icona se serve.
- La freccia indietro resta leggibile (icona sempre visibile, etichetta troncata con i puntini se
  lunga).
- Sotto i 768 px e da 1024 px in su nulla cambia.

## Acceptance Criteria

- AC1: overflow orizzontale 0 a 768, 790, 800, 820, 900 e 1023 px, sulla lista pazienti e
  sull'agenda. Anche con la freccia indietro che porta il nome di un paziente lungo.
- AC2: la freccia indietro è larga almeno 42 px e la sua icona è visibile a tutte queste
  larghezze; il pulsante di ricerca è largo almeno 42 px.
- AC3: 390 e 1280 px invariati: stesse larghezze degli elementi della barra prima e dopo.
- AC4: build ok; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                             |
| ------------------------- | -------: | ---------------------------------- |
| Unit                      |       no | solo CSS                           |
| Integration               |       no |                                    |
| API                       |       no |                                    |
| Playwright                |      yes | misura della barra a più larghezze |
| Persistence after refresh |       no |                                    |
| Agnos action registry     |       no |                                    |
| Voice simulation          |       no |                                    |
| OCR/import test           |       no |                                    |
| Security/privacy scan     |       no |                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (suite completa, build)
- logs/playwright-evidence.txt (prima/dopo), screenshots a 768 px

## Risks

- Solo CSS della barra superiore; rischio di cambiare le proporzioni a larghezze non misurate,
  coperto dalla misura prima/dopo.

## Gate Status

READY FOR IMPLEMENTATION
