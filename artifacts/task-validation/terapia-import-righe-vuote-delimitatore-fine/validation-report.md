# Task Validation Report

## Task
- Title: Terapia import righe vuote delimitatore fine
- Slug: terapia-import-righe-vuote-delimitatore-fine
- Issue: #296
- Commit: (branch `fix/therapy-blank-line-terminator`)
- Date: 2026-07-20

## Implementation Summary

`backend/src/intake/parse-discharge-therapy.ts`: il testo terapia è ora segmentato in paragrafi
sulle righe vuote (`splitTherapyParagraphs`). Un paragrafo "parla di farmaci" se almeno una riga
ha un segnale strutturale di prescrizione (dosaggio, quantità+unità, via di somministrazione,
orari introdotti da "ore"). Dopo che è stato visto contenuto farmacologico, il primo paragrafo
senza segnali TERMINA la terapia: quel paragrafo e tutto ciò che segue non producono righe
(`parseDischargeTherapy` con flag `sawDrugs`). Dentro un paragrafo farmacologico nessuna riga
viene mai scartata (invariante #156: `da_verificare` su struttura mancante). Nessuna route,
schema o UI toccata; il modulo resta privo di logging (invariante privacy).

## Acceptance Criteria Result (TDD: i test AC2 fallivano sul parser precedente)

| AC | Result | Evidence |
|---|---:|---|
| AC1 paragrafi su ≥1 riga vuota | PASS | test `#296 AC4` multi-blocco |
| AC2 prosa dopo delimitatore → terapia terminata | PASS | 2 test `#296 AC2` (prima ROSSI: 10 righe attese, 13/14 prodotte) |
| AC3 nessuna regressione fixture #156/#274 | PASS | 11 test storici verdi invariati; `#296 AC3` PEVARYL da_verificare conservato |
| AC4 multi-blocco + header iniziale | PASS | 2 test `#296 AC4` |
| AC5 suite verde | PASS | parser 18/18; backend completo 360/360; tsc 0 errori |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit parser | PASS 18/18 (5 nuovi #296) | `node --import tsx --test src/intake/__tests__/parse-discharge-therapy.test.ts` |
| Backend suite completa | PASS 360/360 | `npm run test -w backend` (Postgres e2e :5433) |
| Typecheck backend | PASS 0 errori | `npx tsc -p tsconfig.json --noEmit` |
| Playwright | NA | nessuna UI toccata; parser puro coperto da unit deterministici (gate QA produce comunque superficie/screenshot) |

## Residual Risks

- Prosa contenente segnali farmacologici (es. "proseguire terapia per os") viene inclusa: coerente
  col requisito ("parla di farmaci").
- Farmaco atipico senza alcun segnale, da solo in un paragrafo dopo il delimitatore → considerato
  fine terapia (per definizione del requisito); il testo resta comunque nel documento originale.

## Final Decision

IMPLEMENTED — NOT VERIFIED

(In attesa del gate QA interno indipendente.)
