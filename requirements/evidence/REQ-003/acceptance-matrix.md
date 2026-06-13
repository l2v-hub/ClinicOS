# REQ-003 — Acceptance Matrix

Issue #5 · Uniformare spazio sinistro e allineamento navigazione livello 2 e 3
Method: Playwright `getBoundingClientRect().left` measurement (authoritative) + screenshots + overflow check.
Sidebar width = 96px. Uniform page gutter = 32px desktop (1366) / 24px tablet (1024) → content axis x=128 desktop.

## Root cause (why it was still failing despite being marked deployed)
`.page-content:has(.patient-record-view) { padding: 0 }` (app-additions.css:4095) zeroed the
gutter **only on Scheda Paziente**. Measured BEFORE: L2 nav, L3 nav and patient header all at
**x=96 — flush against the sidebar**, while Dashboard/Pazienti/Parametri/Agenda were at x=128 (32px gutter).

## Fix
Stop zeroing horizontal padding on the detail page; override only the vertical fill behaviour so
left/right padding inherits the shared responsive `.page-content` gutter.

| # | Criterion | Method | Page | Before | After | State |
|---|-----------|--------|------|--------|-------|-------|
| 1 | L2 nav not flush to sidebar | rect.left | Scheda Paziente | 96 (flush) | 128 | PASS |
| 2 | L3 nav not flush to sidebar | rect.left | Scheda Paziente | 96 (flush) | 132 (128+ctrl pad) | PASS |
| 3 | Header/tab/card same vertical axis | rect.left | Scheda Paziente | mixed @96 | all @128 | PASS |
| 4 | Same left padding all main pages | computed paddingLeft | all | detail 0 / rest 32 | all 32 | PASS |
| 5 | Content not squished left | visual | Scheda Paziente | flush | gutter visible | PASS |
| 6 | Applied to Dashboard/Pazienti/Parametri/Agenda/Scheda | rect.left | all 5 | 4/5 | 5/5 @128 | PASS |
| 7 | Sidebar behaviour unchanged | code/visual | global | — | untouched | PASS |
| 8 | L2 behaviour unchanged | code | global | — | untouched | PASS |
| 9 | L3 behaviour unchanged | code | global | — | untouched | PASS |
| 10 | No global horizontal overflow | scrollW vs clientW | all 5 × 2 vp | — | no overflow | PASS |
| 11 | Layout correct desktop 1366 | screenshot | all | — | OK | PASS |
| 12 | Layout correct tablet 1024 | screenshot | detail/pazienti | — | OK (24px gutter) | PASS |
| 13 | npm run build passes | build | — | — | EXIT=0 | PASS |

## Regression
- /patients = 10 rows before AND after (data-smoke-before.txt / data-smoke-after.txt) — no data loss.
- Patient detail cards render real data, 0 console errors, bodyChars=730.
- No horizontal overflow on any page (overflow.mjs, both viewports).
