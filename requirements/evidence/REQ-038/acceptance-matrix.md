# REQ-038 — Acceptance Matrix

Issue #50 — Evidenziare le date iniziali nei blocchi narrativi. Branch `req-038-date-prefix-bold`.

## Approach
The narrative renderer `SemanticTaggedText` already bolds offset annotations safely (no
`dangerouslySetInnerHTML`, exact-substring match, newlines preserved, text selectable). REQ-038 adds
a deterministic `DATE_PREFIX` detector (`datePrefix.ts`) computed **at render time** from the exact
text and merged with provided annotations. Because detection runs at render (not persistence): the
stored text is never modified, no markdown/HTML is added, edit mode (a textarea) shows plain text,
and a manual edit recalculates the tags for free. No AI call.

| # | Criterion | Method | Initial | Final | Evidence |
|---|-----------|--------|---------|-------|----------|
| 1 | Dates at line start are bold | unit+visual | absent | PASS | datePrefix test · hospital-course PNG |
| 2 | Dates at paragraph start are bold | unit | absent | PASS | "multiple date prefixes" test |
| 3 | "In data …" recognised (whole expression) | unit+visual | absent | PASS | consultations PNG |
| 4 | Dates inside a sentence NOT marked | unit | n/a | PASS | "inside a sentence" test |
| 5 | Persisted text has no HTML | review+unit | PASS | PASS | render-time only; segments never mutate text |
| 6 | Persisted text has no added Markdown | unit+visual | PASS | PASS | edit-mode PNG plain |
| 7 | Edit mode shows plain text | visual | n/a | PASS | edit-mode-plain-text.png |
| 8 | Tags recalculated after an edit | unit | n/a | PASS | "recalculation after edit" test |
| 9 | Deterministic | unit | n/a | PASS | pure regex, idempotent |
| 10 | No AI model called | review | PASS | PASS | pure frontend function |
| 11 | Rendering is safe | review | PASS | PASS | `<strong>`, no dangerouslySetInnerHTML |
| 12 | Dates selectable/copyable | review | PASS | PASS | plain React text in pre-wrap |

## Required tests (issue) — all in `datePrefix.test.ts` (14)
DD/MM/YYYY · DD-MM-YYYY · textual month · "In data …" · "Il …" · after a bullet · inside a sentence
(negative) · page number (negative) · record number (negative) · manual edit recalculation · multiple
dates in one block · exact offsets · render bold + no mutation · no double-mark vs provided annotation.

## Deploy note
REQ-038 is **frontend-only** (render-time). It has no backend/data change. It therefore ships via
**Vercel** — currently blocked (production deploys stuck >13h; see session report). Code is merged to
`main` and will be live on the next successful Vercel deploy.
