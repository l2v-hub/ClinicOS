# REQ-026 — Acceptance matrix

Issue: #27 — *Estrarre fedelmente le sezioni cliniche e applicare TAG semantici*
Type: **Backend / AI-integration** (no UI surface). Verification method = automated tests against the contract + post-processing, plus model-agnostic prompt/schema review.

Runtime is generic (prompt + JSON Schema in → JSON out), so the contract is **model-independent** by construction — no runtime/provider change.

| # | Acceptance criterion | Method | Evidence | Status |
|---|----------------------|--------|----------|--------|
| 1 | Canonical sections configurable | `imola-profile.json` (12 keys) + test `profile exposes the 12 canonical sections` | profile.ts / sections.test.ts | PASS |
| 2 | Aliases defined in backend profile | `imola-profile.json` aliases, editable without frontend change | asset + `AI_SECTIONS_PROFILE_PATH` | PASS |
| 3 | One rawText per section | `collapseDuplicates` + tests (single-block, dup-collapse) | validate.ts | PASS |
| 4 | Text not summarised | rawText preserved verbatim; multi-paragraph diagnosis test | sections.test.ts | PASS |
| 5 | Text not rewritten | rawText never mutated (annotations only relocate/drop) | validate.ts | PASS |
| 6 | Dates annotated without changing text | DATE annotations; offset reconcile test | sections.test.ts | PASS |
| 7 | Anamnesis subtitles annotated | SUBSECTION_TITLE annotations test | sections.test.ts | PASS |
| 8 | Discharge diagnosis single block | multi-paragraph test | sections.test.ts | PASS |
| 9 | Hospital course single block | sequence-preserved test | sections.test.ts | PASS |
| 10 | Consultations single block | block test | sections.test.ts | PASS |
| 11 | Imaging single block | block test | sections.test.ts | PASS |
| 12 | Procedures single block | block test | sections.test.ts | PASS |
| 13 | Home therapy keeps drug/dose/frequency when readable | medications test | sections.test.ts | PASS |
| 14 | Ambiguous med lines keep original text | `exactText` preserved + warning test | sections.test.ts | PASS |
| 15 | Allergies analysed with priority | top-level `allergies` block, default `not_documented` | validate.ts | PASS |
| 16 | Ambiguous allergy text not interpreted | `unclear` status, rawText kept test | sections.test.ts | PASS |
| 17 | Unmapped content not lost | UNMAPPED_CONTENT preserved test | sections.test.ts | PASS |
| 18 | Tags contain no HTML | enum tags + HTML-strip test; prompt forbids HTML | validate.ts / prompt.ts | PASS |
| 19 | Contract model-independent | generic runtime; buildSectionsRequest returns schema+prompt | index.ts | PASS |
| — | Conflicting allergies block confirmation | `isConfirmBlocked` + confirm-service guard + test | confirm-service.ts | PASS |

## Mandatory tests (issue) → automated coverage
All 16 mandatory scenarios are covered in `backend/src/ai/__tests__/sections.test.ts` (20 tests, all PASS):
multi-paragraph diagnosis · anamnesis subtitles · course with dates · consultations/imaging/procedures/advice blocks · therapy with name/dose/frequency · partially illegible therapy line · home vs hospital therapy distinct · variable advice · explicit allergy · explicit absence · not documented · illegible · conflicting · unmapped content.

## Data-smoke (regression)
- BEFORE: GET /patients → 200, 19 patients.
- AFTER: GET /patients → 200, 19 patients. No regression (sections pass is opt-in, default OFF).
