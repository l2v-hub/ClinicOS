# REQ-025 — Visual verification

**Result: N/A as UI — headless AI-runtime requirement.**

REQ-025 lives entirely in the Python `clinicos-ai-runtime` service (document classification,
page ordering, header/footer separation, page-number recovery). It has **no frontend/UI
surface** — the issue's `imola-*.png` names refer to runtime behaviour that this service
performs headlessly. There is no rendered screen to capture, so no UI screenshots are
produced (none are fabricated).

The faithful, deterministic evidence is the demo dump in `demo-output.txt`, which maps 1:1
to the requested artifacts:

- `imola-profile-detected` → §1 classification (`AUSL_IMOLA_DISCHARGE_LETTER_V1`, confidence 0.75, matched indicators).
- `pages-before-ordering` / `pages-after-ordering` → §2/§3 (upload order 2,3,1 → detected 1,2,3 via footer).
- `header-footer-filtered` → §4 (original immutable; header + footer separated; cleaned = clinical content only).
- `missing-page-warning` → §5 (`MISSING_PAGE_NUMBER: 3`).
- generic fallback → §6 (unrecognised document → `GENERIC_DISCHARGE_LETTER`, never rejected).

All scenarios are also locked by `tests/test_document_profiles.py` (17 tests, PASS) and the
full runtime suite (36/36), `py_compile`, and the SDK-isolation guard.
