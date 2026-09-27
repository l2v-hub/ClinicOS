# Task Contract

## Task

- Title: HMI parità 10: farmaci come il prototipo
- Slug: hmi-parita-10-farmaci-come-il-prototipo
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

La pagina "Anagrafica farmaci" è diversa dal prototipo HMI 1 (artifacts/hmi-parity/proto/farmaci.png).

- Oggi il campo di ricerca è sottile (14 px) e le chip del criterio sono piccole. A campo vuoto la pagina resta bianca, senza indicazioni.
- Il prototipo mostra "Farmaci · Anagrafica AIFA" con un campo grande "Cerca per principio attivo o nome commerciale". Ogni risultato è una riga con icona, nome in grassetto, "principio · forma · classe" e il pulsante "Scheda".

## Expected Behaviour

La pagina Farmaci come il prototipo, con la ricerca AIFA di oggi (lato server, almeno 3 caratteri).

- **Intestazione**: "Farmaci", sottotitolo "Anagrafica AIFA".
- **Card**:
  - campo di ricerca da 48 px, testo 16 px;
  - chip del criterio (Nome commerciale / Principio attivo) da 48 px;
  - a campo vuoto un'indicazione "Scrivi almeno tre lettere…".
- **Righe**:
  - icona;
  - nome in grassetto;
  - confezione e AIC su una riga;
  - principi attivi;
  - stato "revocato/sospeso" come oggi;
  - pulsante "Apri foglietto/RCP" (secondario, 48 px) oppure "Nessun documento ufficiale".
- La modale di ricerca aperta dalla terapia usa lo stesso corpo. Gli stili nuovi valgono solo nella pagina. Icona e indicazione a campo vuoto compaiono anche nella modale.
- Il prototipo mostra un elenco senza ricerca: l'anagrafica AIFA ha decine di migliaia di confezioni e si consulta solo cercando. Non si mostra un elenco inventato.

## Acceptance Criteria

- AC1: a 1180 × 820 compaiono intestazione "Farmaci · Anagrafica AIFA", card con campo da 48 px e chip da 48 px, e l'indicazione a campo vuoto.
- AC2: con risultati (simulati), ogni riga ha icona, nome, confezione · AIC, principi attivi e il pulsante documento da 48 px. Il pulsante apre il visore come oggi.
- AC3: cambiano gli stati ("almeno tre caratteri", ricerca in corso, nessun risultato con suggerimento, errore con "Riprova ricerca", "Continua ricerca"). Il criterio invia la stessa query.
- AC4: nessuno scorrimento orizzontale a 390, 768, 1024, 1180 e 1440. La modale dalla terapia resta funzionante.
- AC5: la build passa; nessun nuovo test fallito rispetto alla baseline.

## Test Plan

| Test type                 | Required | Reason                           |
| ------------------------- | -------: | -------------------------------- |
| Unit                      |      yes | suite esistente                  |
| Integration               |       no |                                  |
| API                       |       no | stessa API                       |
| Playwright                |      yes | aspetto, stati, righe, larghezze |
| Persistence after refresh |       no |                                  |
| Agnos action registry     |       no |                                  |
| Voice simulation          |       no |                                  |
| OCR/import test           |       no |                                  |
| Security/privacy scan     |       no |                                  |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (suite completa, build)
- logs/playwright-evidence.txt; confronto con proto/farmaci.png

## Risks

- Il corpo di ricerca è condiviso con la modale della terapia: gli stili sono limitati alla pagina.

## Gate Status

READY FOR IMPLEMENTATION
