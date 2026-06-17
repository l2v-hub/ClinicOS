# REQ-037 — Verification

Issue #49. Branch `req-037-header-footer-filter`. Date 2026-06-17.

REQ-037 is backend/AI-pipeline only and, per the issue, **not surfaced to the ordinary user**
("Non è necessario mostrare questa funzione all'utente ordinario, salvo modalità diagnostica o
warning"). There is therefore no UI screenshot; evidence is unit tests + before/after text artifacts.

## What was built
`backend/src/ai/sections/header-filter.ts` — `filterRepeatedHeaders(rawText)`: deterministic,
config-driven removal of repetitive page headers/footers from the combined OCR transcription,
applied in `runJob` BEFORE `parseNarrativeFromMarkdown`. The original `rawText` is kept immutable
(document preview); `cleanedRawText` + `_headerFilter` metadata are stored in the job result.

- Keeps the FIRST header occurrence (anagraphic data preserved), removes later duplicates.
- Confidence score = position + repetition + label + table-layout; only blocks that REPEAT and
  score ≥ `DOCUMENT_HEADER_CONFIDENCE_THRESHOLD` (default 0.85) are removed; below threshold → kept
  + `AMBIGUOUS_HEADER_KEPT` warning.
- Footer page numbers recovered BEFORE the footer line is stripped; footer lines that also carry
  clinical text are kept + `FOOTER_WITH_EXTRA_TEXT_KEPT` warning.
- Idempotent (re-running on cleaned text removes nothing) — safe for the self-heal re-parse.
- Config via env (`DOCUMENT_HEADER_LABELS`, `DOCUMENT_HEADER_REQUIRED_MATCHES`,
  `DOCUMENT_HEADER_CONFIDENCE_THRESHOLD`); no hospital rule in the frontend.

## Tests
- `backend/src/ai/__tests__/header-filter.test.ts` — 14/14, covering every required test case:
  identical header all pages · same labels different values · tabular header · page without header ·
  clinical text at top (not a header) · ambiguous below threshold (kept+warned) · footer with page
  number · footer with extra text · anagrafica from first page · Anamnesi continuation · Terapia
  continuation · no anagraphic duplication · idempotency · config.
- Full backend suite **112/112**, `tsc` 0 errors.

## Live pipeline artifact (deterministic, no model needed)
`backend/scripts/req037-evidence.ts` runs a 3-page Imola-style transcription (repeated patient
header + "Pagina N di 3" footers) through `filterRepeatedHeaders` → `parseNarrativeFromMarkdown`:
- `page-original-ocr.txt` — input (3 repeated headers + 3 footers).
- `header-footer-detected.txt` — removedHeaderBlocks=2, removedFooterLines=3, pages [1,2,3]
  recovered, matchedLabels = paziente/nascita/residenza/codice fiscale/reparto.
- `cleaned-page-text.txt` — header present once; Anamnesi/Decorso/Terapia intact.
- `cross-page-text-without-header.txt` — patient-header occurrences = 1; no header between the two
  Anamnesi fragments; parsed ANAMNESI/DECORSO/TERAPIA blocks are clean.

## Data smoke
prod `/patients` 200, **19** patients before & after (no regression).

## Limitation (documented)
The runtime's `document_profiles.process_document` per-page contract pipeline (per-page
`detectedPageNumber`/`headerConfidence`) is not wired into the live path because the AI runtime
transcribes all files in ONE call (no per-page OCR). REQ-037's live outcome is delivered at the
Node layer on the combined transcription. Wiring the runtime per-page pipeline requires per-page OCR
(PDF page split + per-page model calls) — a separate AI-runtime architectural change, tracked apart.
