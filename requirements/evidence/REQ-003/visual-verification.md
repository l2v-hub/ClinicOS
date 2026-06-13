# REQ-003 — Visual Verification (iterative)

Target: nav L2/L3 + content must share one uniform left gutter after the sidebar on every main page.
Measurement is authoritative (`rect.left`); screenshots confirm.

## Iteration 0 — BEFORE (FAIL)
Cross-page `rect.left`:
- Dashboard / Pazienti / Parametri / Agenda: content @ **128** (32px gutter) ✓
- Scheda Paziente: L2 @96, L3 @96, header @96, content @96 — **FLUSH against sidebar** ✗
Verdict: FAIL — Scheda Paziente nav L2/L3 attached to sidebar; gutter not uniform.
Evidence: before-detail-desktop.png (content edge-to-edge with sidebar).

## Iteration 1 — fix applied → PASS
Change: `.page-content:has(.patient-record-view)` no longer zeroes horizontal padding;
inherits the shared responsive `.page-content` gutter (24/32px). Vertical fill kept.

Cross-page `rect.left` after:
| Page | mainPad | L2 | L3 | header/card |
|------|---------|----|----|-------------|
| Dashboard | 32px | — | — | 128 |
| Pazienti | 32px | — | — | 128 / tbl 130 |
| Scheda Paziente | 32px | **128** | **128** | hdr 128 |
| Parametri | 32px | — | — | 128 |
| Agenda | 32px | — | — | 128 |

- All pages now share x=128 axis (desktop) / 24px gutter (tablet).
- L2 nav: 96 → 128. L3 nav: 96 → 128. Patient header: 96 → 128.
- No global horizontal overflow (desktop + tablet, all 5 pages).
- Patient data intact (10 patients), 0 console errors.

Verdict: **PASS** — nav L2/L3 no longer attached to sidebar; gutter uniform across all main pages,
both viewports. Evidence: after-detail-desktop.png, after-detail-tablet.png, after-pazienti-tablet.png.

Reviewer note: requirement was previously marked deployed but the detail page still violated it;
reprocessing surfaced and corrected the regression with a single surgical CSS change.
