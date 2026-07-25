# Task Validation Report

## Task

- Title: Trascrizione: intestazioni di sezione esplicite per la segmentazione della narrativa
- Slug: trascrizione-intestazioni-di-sezione-esplicite-per-la-segmentazione-della-narrat
- Commit: PR #304 (merge `ef87ef1`)
- Date: 2026-07-25

## Implementation Summary

Il prompt di trascrizione (`TRANSCRIBE_PROMPT` in `backend/src/ai/upload/job-service.ts`) impone
ora una riga `## NOME` prima di ogni sezione clinica, con NOME scelto tra i nomi canonici gia'
mappati dal parser (`FIELD_TO_ITALIAN` in `sections/markdown-parse.ts`). Il percorso `MD_HEADING`
di `parseNarrativeFromMarkdown` riconosce sempre quelle righe, senza dipendere dalle euristiche
sul testo piano — che scartano le righe con punteggiatura o piu' lunghe di 60 caratteri.

La fedelta' resta vincolata nel prompt: niente sezioni inventate, nessuno spostamento di testo,
intestazione originale del documento conservata sotto quella markdown.

## Files Changed

- `backend/src/ai/upload/job-service.ts` — `TRANSCRIBE_PROMPT`
- `backend/src/ai/__tests__/lazy-sections.test.ts` — guardia sull'allineamento prompt/parser

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                               |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Il test verifica che ognuno dei 7 nomi canonici sia elencato nel prompt E presente in `FIELD_TO_ITALIAN`, piu' la presenza di `## NOME`. Un disallineamento renderebbe l'intestazione non mappabile e riporterebbe il bug in silenzio. |
| AC2 |   PASS | Confronto prima/dopo sullo STESSO documento in produzione (sotto): da 1 sezione con terapia vuota a 4 sezioni con terapia popolata.                                                                                                    |
| AC3 |   PASS | Backend **381/381 pass, 0 fail**; `npx tsc --noEmit` pulito.                                                                                                                                                                           |

## Test Results

| Test             | Result | Evidence                                              |
| ---------------- | -----: | ----------------------------------------------------- |
| Unit             |   PASS | `# tests 381 # pass 381 # fail 0`                     |
| Integration      |     NA |                                                       |
| API              |     NA | contratto invariato                                   |
| Playwright       |     NA | nessuna modifica UI                                   |
| Persistence      |     NA |                                                       |
| Agnos AI         |     NA |                                                       |
| Voice            |     NA |                                                       |
| OCR              |   PASS | verifica end-to-end in produzione, prima/dopo (sotto) |
| Security/privacy |     NA | nessun secret; documento di prova sintetico           |

## Runtime Evidence

**Diagnosi di partenza** — job di produzione reale dell'operatore (5 foto, 18.987 caratteri
trascritti), ispezionato solo nella struttura, senza estrarre contenuto clinico:

- estrazione strutturata OK: `_full.cartella` con 29 farmaci, 7 terapie, 16 diagnosi, 6 allergie;
- narrativa inutilizzabile: **17.880 dei 18.987 caratteri** in un unico campo
  `proceduresAndInterventionsText`, con `therapyText`, `diagnosisText`, `anamnesisText` e
  `hospitalCourseText` VUOTI;
- analisi del testo: **0 righe con heading markdown**, 2 righe che iniziano con un'etichetta di
  sezione, 12 righe simili a intestazioni scartate dalle euristiche (6 per punteggiatura,
  6 perche' oltre 60 caratteri).

**Confronto prima/dopo sullo stesso documento**, in produzione. Documento sintetico di 6 pagine
costruito per riprodurre il caso reale: intestazioni MAIUSCOLE contenenti punti e piu' lunghe di
60 caratteri.

```
PRIMA | heading md: 0 | sezioni narrative: 1 | terapia vuota: True
        {'diagnosis': 410}
DOPO  | heading md: 5 | sezioni narrative: 4 | terapia vuota: False
        {'therapy': 170, 'anamnesis': 311, 'diagnosis': 143, 'adviceAndFollowUp': 140}
```

La baseline "PRIMA" e' stata misurata in produzione col codice precedente e riproduce esattamente
il sintomo del referto reale (tutto in una sezione, terapia vuota). Dopo il deploy, lo stesso
documento viene segmentato in 4 sezioni con la terapia al posto giusto.

Job sintetici di verifica cancellati; nessun paziente creato.

## Logs

- backend: `# tests 381 # pass 381 # fail 0`
- Nessun contenuto clinico nei log: del job reale sono stati letti solo conteggi (lunghezze dei
  campi, numero di elementi nelle liste, statistiche sulle righe), mai il testo del referto.

## Residual Risks

- Il prompt chiede al modello di **classificare** le sezioni: e' un grado di interpretazione in
  piu' rispetto alla pura trascrizione. Mitigato nel prompt (non inventare, non spostare testo),
  ma su referti con sezioni atipiche una parte di testo puo' finire nella sezione precedente.
- La verifica end-to-end usa un documento sintetico che riproduce le caratteristiche del referto
  reale (intestazioni sporche), non il referto reale: quello contiene dati clinici e non e'
  riproducibile come fixture. La conferma definitiva e' un nuovo import dell'operatore.
- Il test AC1 e' una guardia sull'allineamento dei nomi, non sulla resa del modello.

## Final Decision

CLOSED — VERIFIED
