# REQ-025 — Acceptance matrix

Issue: #26 — *Profilo documentale Imola e ordinamento pagine* (title REQ-025; body has stale "REQ-023").
Type: **AI runtime (Python `clinicos-ai-runtime`)**, headless. Verification = stdlib unittest + deterministic demo dump. Model-independent: all logic is profile-driven, no provider SDK, no hardcoded hospital condition.

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | `AUSL_IMOLA_DISCHARGE_LETTER_V1` exists | `profiles/ausl_imola_discharge_letter_v1.json` + classify test | PASS |
| 2 | Profile configurable without changing the workflow | JSON profiles loaded by `DocumentProfileRegistry`; `AI_SECTIONS_*`-style file edits only | PASS |
| 3 | Header & footer separated per page | `split_header_footer` + `test_repetitive_header_footer_removed` + demo §4 | PASS |
| 4 | Page number recovered before footer removal | `test_recovered_before_footer_removed` | PASS |
| 5 | Pages ordered by detected number | `order_pages` + `test_photos_out_of_order_get_sorted` + demo §3 | PASS |
| 6 | Original text immutable | `test_original_text_immutable` (originalRawText unchanged) | PASS |
| 7 | Cleaned clinical text has no repetitive header/footer | demo §4 (cleaned = content only) | PASS |
| 8 | Ambiguous lines not deleted | `test_header_with_anagraphic_data_is_kept` (kept + `AMBIGUOUS_HEADER_LINE_KEPT`) | PASS |
| 9 | Missing pages flagged | `test_missing_page_flagged` → `MISSING_PAGE_NUMBER: 3` + demo §5 | PASS |
| 10 | Duplicate page numbers flagged | `test_duplicate_page_number_flagged_both_kept` (both kept, no auto-pick) | PASS |
| 11 | No Imola logic in the frontend | implemented entirely in the runtime; no FE change | PASS |
| 12 | No hardcoded Imola rules in the AI model | profile-driven; SDK-isolation guard passes; no `if hospital==` | PASS |
| 13 | Profile replaceable by another hospital | `generic_discharge_letter.json` + registry `get` fallback; drop-in JSON | PASS |

## Mandatory tests → coverage (`tests/test_document_profiles.py`, 17 tests, all PASS)
single-page Imola · multi-page · out-of-order photos · footer "Pagina X di Y" · footer "Pag. X/Y" · bare "X / Y" · "Pagina X" · missing page · duplicate page number · header with anagraphic data (kept) · unrecognised document → generic fallback.

## Suite / guards
- `python -m unittest discover -s tests` → **36/36** (19 prior + 17 new).
- `py_compile` all modules → OK.
- SDK-isolation guard (no provider SDK outside models/providers) → OK.

## Note on wiring
Page-text arrives from Mistral Document AI, which OCRs server-side; surfacing per-page raw
text into the live workflow to apply this preprocessing is a follow-up integration. The
profile system + page processing are complete, deterministic, and unit-verified here, and
expose a clean API (`classify` → `get` → `process_document`) for that wiring.
