# REQ-038 — Visual Verification

Issue #50. Branch `req-038-date-prefix-bold`. Date 2026-06-17.

Rendered with the REAL pipeline (`withDatePrefixes` → `buildSegments` → `<strong class="stt-date-prefix">`)
and the REAL `app-additions.css` stt rules, captured headless with Playwright Chromium at 1366×768
(`frontend/scripts/req038-evidence.mts`). 0 console errors.

| File | Shows | Verdict |
|------|-------|---------|
| `hospital-course-date-prefix-bold.png` | `09/03/2026` / `12/03/2026` bold (brand blue); `Il 15/03/2026` whole expression bold; body normal | PASS |
| `consultations-date-prefix-bold.png` | `In data 09/03/2026` whole expression bold; bullet dates bold; textual month `11 marzo 2026` bold | PASS |
| `imaging-date-prefix-bold.png` | `09/03/2026` + `10-03-2026` bold at line start | PASS |
| `therapy-date-prefix-bold.png` | leading `09/03/2026` bold; a mid-sentence date ("...modificata il 12/03/2026.") NOT bold | PASS |
| `edit-mode-plain-text.png` | stored text in a textarea — plain dates, NO bold, NO markdown | PASS |

## Reviewer notes
- Whole-expression highlight for "In data …" / "Il …" matches the issue.
- A date inside a sentence is left un-bold (prefix-only) — see the therapy sample.
- The bold is a render annotation; the underlying/stored text is unchanged (edit mode proves it).
- Brand blue, no red, selectable text, newlines preserved.

## Limitation
Live in-app screenshots over a real patient narrative require (a) a patient with narrative sections
and (b) a live frontend deploy. The Vercel production deploy is blocked (>13h, see session report).
The artifacts above use the exact production render path + CSS, so they are faithful to what the app
will show once deployed.
