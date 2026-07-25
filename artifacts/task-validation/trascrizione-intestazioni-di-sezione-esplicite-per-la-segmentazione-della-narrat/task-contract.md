# Task Contract

## Task
- Title: Trascrizione: intestazioni di sezione esplicite per la segmentazione della narrativa
- Slug: trascrizione-intestazioni-di-sezione-esplicite-per-la-segmentazione-della-narrat
- Type: change
- Date: 2026-07-25

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Su un referto reale dell'operatore (job di produzione, 5 foto, 18.987 caratteri trascritti)
l'estrazione strutturata funziona benissimo — `_full.cartella` contiene 29 farmaci, 7 terapie,
16 diagnosi, 6 allergie — ma la **narrativa mostrata nella Revisione e' inutilizzabile**:
17.880 dei 18.987 caratteri finiscono in un unico campo `proceduresAndInterventionsText`,
mentre `therapyText`, `diagnosisText`, `anamnesisText` e `hospitalCourseText` restano VUOTI.
L'operatore vede quindi "terapia non identificata" pur essendo il testo presente, ammassato
nella sezione sbagliata.

Causa: `parseNarrativeFromMarkdown` segmenta sulle intestazioni. Analisi del testo trascritto:
**0 righe con intestazione markdown** (`#`), solo 2 righe che iniziano con un'etichetta di
sezione, e 12 righe che sembrano intestazioni scartate dalle euristiche del parser sul testo
piano (6 perche' contengono `.`/`!`/`?`, 6 perche' superano i 60 caratteri). Mistral Document AI
produceva il markdown con intestazioni nativamente; un modello generalista no, e il prompt di
trascrizione non gliele chiedeva.

## Expected Behaviour

Il prompt di trascrizione impone di inserire una riga `## NOME` prima di ogni sezione clinica,
con NOME scelto tra i nomi canonici gia' mappati dal parser (`FIELD_TO_ITALIAN`): ANAMNESI,
DIAGNOSI, DECORSO_OSPEDALIERO, CONSULENZE, DIAGNOSTICA_PER_IMMAGINI, PRESTAZIONI_E_INTERVENTI,
TERAPIA, CONSIGLI_E_CONTROLLI, ALLERGIE. Il percorso `MD_HEADING` del parser riconosce sempre
quelle righe, senza dipendere dalle euristiche fragili sul testo piano. La fedelta' resta
vincolata: niente sezioni inventate, nessuno spostamento di testo.

## Acceptance Criteria

- AC1: il prompt elenca tutti i nomi canonici e chiede intestazioni `## NOME`; i nomi coincidono
  con `FIELD_TO_ITALIAN` in `sections/markdown-parse.ts` (un disallineamento renderebbe
  l'intestazione non mappabile).
- AC2: su un documento multi-pagina con intestazioni "sporche" (MAIUSCOLE con punti, oppure piu'
  lunghe di 60 caratteri) — cioe' il caso che oggi fallisce — la narrativa risulta segmentata in
  piu' sezioni e `therapyText` NON e' vuoto.
- AC3: suite backend verde e `tsc --noEmit` pulito.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | guardia sull'allineamento prompt/parser (AC1) |
| Integration | no | |
| API | no | contratto invariato |
| Playwright | no | nessuna modifica UI |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | verifica end-to-end in produzione con documento a intestazioni sporche (AC2) |
| Security/privacy scan | no | nessun secret; nessun dato reale nei test |

## Evidence Plan

Required evidence:

- validation-report.md
- output suite backend
- esito end-to-end in produzione: numero di sezioni narrative popolate e `therapyText` non vuoto

## Risks

- Il prompt chiede al modello di **classificare** le sezioni: e' un grado di interpretazione in
  piu' rispetto alla pura trascrizione. Mitigazione esplicita nel prompt: non inventare sezioni
  assenti, non spostare testo, conservare l'intestazione originale sotto quella markdown.
- Una sezione del documento non riconducibile ai nomi canonici puo' finire nella sezione
  precedente: come oggi, ma su granularita' piu' fine.
- Il test AC1 e' una guardia sull'allineamento dei nomi, non sulla resa del modello: la prova
  vera e' l'esito end-to-end (AC2).

## Gate Status

READY FOR IMPLEMENTATION
