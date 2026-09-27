# Task Validation Report

## Task

- Title: Barra superiore: niente scorrimento orizzontale fra 768 e 830 px
- Slug: barra-superiore-niente-scorrimento-orizzontale-fra-768-e-830-px
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`App.css`, `.topbar-search`:** aggiunti `min-width: 42px` e `overflow: hidden`. Il pulsante di
  ricerca ora si restringe fino alla sola icona. Prima il suo testo segnaposto imponeva circa
  367 px e spingeva la barra oltre lo schermo.
- **`App.css`, `.topbar-back`:** `min-width` passa da 0 a 42 px, così l'icona della freccia indietro
  resta sempre visibile e si accorcia solo l'etichetta.

- **`App.css`, `.topbar-search__kbd`:** sotto i 1024 px il badge della scorciatoia "/" non si
  mostra più. Con la ricerca stretta veniva tagliato a metà (avviso della QA, con un'etichetta
  indietro di 55 caratteri).

## Files Changed

- frontend/src/App.css

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                           |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | logs/playwright-dopo.txt: overflow 0 a 768/790/800/820/900/1023 su Pazienti e Agenda, anche con la freccia indietro verso un paziente ("Moretti, Andrea"). La QA ha provato anche un'etichetta indietro di 280 px (55 caratteri) e il ruolo Amministratore: overflow sempre 0. Prima: 30 px a 768 e 8 px a 790 (logs/playwright-prima.txt) |
| AC2 |   PASS | freccia 123–155 px con icona visibile, ricerca 188–475 px. Prima la freccia era di 26–28 px con l'icona tagliata fino a 820 px                                                                     |
| AC3 |   PASS | misure-prima.json / misure-dopo.json: a 390 e 1280 px freccia, ricerca e contesto hanno le stesse larghezze (42/42/40 e 123/520/295)                                                               |
| AC4 |   PASS | build.txt exit 0; unit-full.txt 834/843, stessi 9 fallimenti della baseline                                                                                                                        |

## Test Results

| Test             | Result | Evidence                                |
| ---------------- | -----: | --------------------------------------- |
| Unit             |     NA | solo CSS; suite completa invariata      |
| Integration      |     NA |                                         |
| API              |     NA |                                         |
| Playwright       |   PASS | evidence.mjs 26/26 dopo (14 FAIL prima) |
| Persistence      |     NA |                                         |
| Agnos AI         |     NA |                                         |
| Voice            |     NA |                                         |
| OCR              |     NA |                                         |
| Security/privacy |     NA |                                         |

## Runtime Evidence

- screenshots/prima-768-pazienti.png e dopo-768-pazienti.png

## Independent QA

- READY FOR QA:
  - build e suite 834/843 (baseline); evidence 26/26 riprodotta byte per byte;
  - confronto con origin/main su 81 combinazioni (9 larghezze × pagine, Operatore e
    Amministratore):
    - overflow 0 ovunque;
    - a 360–767 px e da 1024 px in su le larghezze sono identiche a main;
    - a 1280 px i riquadri coincidono entro 0,01 px;
  - anello di focus della ricerca visibile; la ricerca si apre con clic e con Invio.
- Su main il difetto era di 47 px per l'Amministratore, contro 30 px per l'Operatore.
- Avviso cosmetico: il badge "/" veniva tagliato con etichette molto lunghe. Corretto
  nascondendolo sotto i 1024 px; rieseguiti evidence 26/26, build e suite 834/843.

## Residual Risks

- Nessuno noto: la modifica tocca solo i minimi di larghezza di due elementi della barra.

## Final Decision

CLOSED — VERIFIED
