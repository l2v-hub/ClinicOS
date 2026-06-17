# REQ-037 — Acceptance Matrix

Issue #49 — Riconoscere e filtrare header e footer ripetitivi.
Branch `req-037-header-footer-filter`. Date 2026-06-17.

## Architecture decision
The runtime (`clinicos-ai-runtime`) sends all files to ONE extraction call — there is no
per-page OCR, so the existing `document_profiles.process_document` page pipeline is **not wired
into the live path**. The live consumer of the transcription is the **Node backend**:
`runJob` gets a single combined `rawText` and `parseNarrativeFromMarkdown` builds the narrative
from it. Repeated page headers/footers therefore appear as repeated blocks inside that combined
text. REQ-037 is delivered as a deterministic Node-backend filter on that combined text
(`backend/src/ai/sections/header-filter.ts`) that runs BEFORE narrative parsing — backend-only,
no model call, no per-page OCR, deploys to Railway. Config-driven (label list + env threshold),
no hospital rule in the frontend.

| # | Acceptance criterion | Method | Initial | Final | Evidence |
|---|----------------------|--------|---------|-------|----------|
| 1 | Page number recovered before footer filtering | unit | n/a | PASS | footer page-number captured before strip |
| 2 | Repetitive headers identified | unit | absent | PASS | repeated-block detection |
| 3 | Anagraphic labels contribute to recognition | unit | absent | PASS | labelScore |
| 4 | Tabular form contributes | unit | absent | PASS | tableLayoutScore (label:value) |
| 5 | High-confidence headers excluded | unit | absent | PASS | ≥ threshold → removed |
| 6 | Ambiguous headers NOT removed | unit | absent | PASS | < threshold → kept + warning |
| 7 | Anagraphic data recovered before filtering | unit | absent | PASS | first occurrence kept |
| 8 | Original text remains available | unit | PASS | PASS | `rawText` kept; `cleanedRawText` added |
| 9 | cleanedRawText has no duplicated headers | unit | FAIL | PASS | dedup keeps first only |
| 10 | Footer absent from narrative sections | unit | FAIL | PASS | repeated footer stripped |
| 11 | Page number preserved | unit | n/a | PASS | reported in warnings/meta |
| 12 | Sections continue across pages | unit | partial | PASS | interleaved header removed → merge |
| 13 | Behavior configured in a profile | unit | absent | PASS | label list + threshold config (not hardcoded in FE) |
| 14 | No Imola rule hardcoded in frontend | review | PASS | PASS | logic is backend-only |

## Required tests (issue)
identical header all pages · header same labels diff values · tabular header · page without header ·
clinical text at top · ambiguous header below threshold · footer with page number · footer with
extra text · anagrafica from first page · anamnesi continuation across pages · terapia continuation ·
no anagraphic duplication — all as unit tests in `header-filter.test.ts`.

## Out of scope / documented
- Deep per-page contracts (`detectedPageNumber`/`headerConfidence` per page in the runtime
  `process_document` pipeline) require the runtime to do per-page OCR (PDF page split + per-page
  model calls) — a separate architectural change to the AI runtime. The runtime module already
  exists and is unit-tested (REQ-025); wiring it needs per-page OCR and is tracked separately.
- No UI: the issue states this is not shown to the ordinary user (diagnostic/warning only), so
  there is no visual screenshot deliverable; evidence is unit tests + before/after cleaned-text samples.
