# Task Contract

## Task

- Title: HMI: dashboard operatore organizzata come Turno (Adesso e Oggi)
- Slug: hmi-dashboard-operatore-organizzata-come-turno-adesso-e-oggi
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

- La dashboard operatore impila in una sola colonna, dall'alto: centro notifiche, indicatori,
  scadenze di terapia, prossimo appuntamento, agenda di oggi, consegne urgenti.
- Sul tablet, per vedere le consegne urgenti o l'agenda si scorre molto.

## Expected Behaviour

- Layout "Turno" (HMI 1), con gli stessi contenuti e lo stesso ordine di priorità:
  - in cima, a tutta larghezza, centro notifiche e indicatori (ordine invariato, vincolato da
    test);
  - sotto, due colonne dal tablet in su:
    - "Adesso": scadenze di terapia e consegne urgenti, cioè ciò che chiede un'azione;
    - "Oggi": prossimo appuntamento e agenda;
  - sul telefono (< 768 px) le colonne si impilano.
- Nessun contenuto, dato o azione cambia.

## Acceptance Criteria

- AC1: nel browser la dashboard mostra notifiche, poi indicatori, poi le sezioni "Adesso" e
  "Oggi", affiancate a 1024 e 1280 px e impilate a 390 px.
- AC2: tutti i blocchi di prima sono presenti con le stesse azioni:
  - scadenze di terapia;
  - prossimo appuntamento, quando c'è;
  - agenda di oggi con "Vedi tutto";
  - consegne urgenti, quando ci sono.
- AC3: nessuno scorrimento orizzontale della pagina a 1024, 1280 e 390 px.
- AC4: build ok; nessun nuovo test fallito rispetto alla baseline; i test della dashboard
  (first-view, anomaly-layout, clinicalOverviewResilience, consegneReadModelGuard) passano.

## Test Plan

| Test type                 | Required | Reason                                        |
| ------------------------- | -------: | --------------------------------------------- |
| Unit                      |      yes | test di contratto della dashboard             |
| Integration               |       no |                                               |
| API                       |       no |                                               |
| Playwright                |      yes | layout a tre larghezze e presenza dei blocchi |
| Persistence after refresh |       no |                                               |
| Agnos action registry     |       no |                                               |
| Voice simulation          |       no |                                               |
| OCR/import test           |       no |                                               |
| Security/privacy scan     |       no |                                               |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (unit, suite completa, build)
- logs/playwright-evidence.txt, screenshots a 1280 e 390 px

## Risks

- Nessun dato cambia: rischio solo visivo (colonne strette a 1024 px con la barra laterale).

## Gate Status

READY FOR IMPLEMENTATION
