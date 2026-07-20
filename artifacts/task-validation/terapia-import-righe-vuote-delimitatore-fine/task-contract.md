# Task Contract

## Task

- Title: Terapia import righe vuote delimitatore fine
- Slug: terapia-import-righe-vuote-delimitatore-fine
- Type: bugfix
- Date: 2026-07-20
- Issue: #296

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Solo il parser deterministico `backend/src/intake/parse-discharge-therapy.ts` (nessuna route/schema).

## Current Behaviour

`parseDischargeTherapy` scarta tutte le righe vuote (`splitTherapyLines`) e converte ogni riga non
vuota del blocco terapia in una riga farmaco: la prosa che segue le prescrizioni (consigli,
follow-up) diventa righe farmaco spurie `da_verificare` che l'operatore deve eliminare a mano.

## Expected Behaviour

Le righe vuote sono il delimitatore di fine terapia: il testo è segmentato in paragrafi sulle
righe vuote; dopo che è stato visto contenuto farmacologico, il primo paragrafo privo di segnali
farmacologici (dosaggio, quantità, via di somministrazione, orari "ore HH:MM") TERMINA la terapia
— quel paragrafo e tutto ciò che segue non producono righe. I blocchi farmaci multipli separati da
righe vuote restano tutti parsati; un'intestazione iniziale seguita da riga vuota non termina.

## Acceptance Criteria

- AC1: segmentazione in paragrafi su ≥1 riga vuota.
- AC2: primo paragrafo non-farmacologico dopo contenuto farmacologico → terapia terminata, nessuna riga da lì in poi.
- AC3: nessuna regressione sui fixture #156/#274 (blocco singolo, righe da_verificare conservate).
- AC4: più blocchi farmaci separati da righe vuote → tutti parsati; header iniziale + riga vuota non termina.
- AC5: unit test nuovi + suite backend completa verde.

## Test Plan

| Test type                 | Required | Reason                                                                                                                     |
| ------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | nuovi casi in `parse-discharge-therapy.test.ts` + regressione fixture                                                      |
| Integration               |       no | parser puro, nessun I/O                                                                                                    |
| API                       |       no | nessuna route toccata                                                                                                      |
| Playwright                |       no | nessuna UI toccata; il comportamento è interamente coperto da unit deterministici sul parser puro (evidenza = output test) |
| Persistence after refresh |       no | nessun dato                                                                                                                |
| Agnos action registry     |       no | non toccato                                                                                                                |
| Voice simulation          |       no | non toccato                                                                                                                |
| OCR/import test           |      yes | il parser È il passo import (unit)                                                                                         |
| Security/privacy scan     |      yes | fixture sintetiche, il modulo non logga (invariante esistente)                                                             |

## Evidence Plan

- validation-report.md con output dei test (unit nuovi + suite completa)

## Risks

- Prosa che contiene segnali farmacologici (es. "proseguire terapia per os") viene ancora inclusa:
  accettato — "parla di farmaci" per definizione del requisito.
- Un farmaco atipico senza alcun segnale strutturale in un paragrafo isolato dopo il delimitatore
  viene interpretato come fine terapia: coerente col requisito (non "parla di farmaci" in modo
  riconoscibile); la riga resta visibile nel testo originale del documento.

## Gate Status

READY FOR IMPLEMENTATION
