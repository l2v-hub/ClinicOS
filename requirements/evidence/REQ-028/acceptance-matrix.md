# REQ-028 — Acceptance matrix

Issue: #32 — *Estrarre la lettera di dimissione come sezioni testuali fedeli* (title REQ-028; body stale "REQ-024").
Type: **Backend / AI-integration** (no UI). Model-independent: the flat narrative draft is a deterministic transform of REQ-026's faithful `_sections`. Verified by unit tests.

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Result contains `diagnosisText` | `buildNarrativeDraft` + test "flat narrative draft" | PASS |
| 2 | No `diagnoses[]` returned | test asserts `.diagnoses/.medications/.consultations === undefined` | PASS |
| 3 | Diagnosis one block | test "diagnosis multi-paragraph stays one block" | PASS |
| 4 | Anamnesis one block | test "anamnesis subtitles preserved" | PASS |
| 5 | Hospital course one block | test "hospital course keeps dates" | PASS |
| 6 | Consultations one block | test "consultations/imaging/procedures one block" | PASS |
| 7 | Imaging one block | same test | PASS |
| 8 | Procedures one block | same test | PASS |
| 9 | Therapy one block | test "therapy combines home+hospital" | PASS |
| 10 | Advice one block | test "advice kept integrally" | PASS |
| 11 | Text not summarised | rawText copied verbatim into `*Text` (no transform) | PASS |
| 12 | Allergies faithful text | test "allergies faithful" (text exact, status enum) | PASS |
| 13 | Unmapped content not lost | test "unmapped not lost" (`unmappedText`) | PASS |
| 14 | Annotations don't modify text | boldTags are offsets; `*Text.slice(start,end)===text` asserted | PASS |
| 15 | Contract model-independent | pure transform of `_sections`; AJV `clinicos-discharge-narrative-v1` | PASS |

## Mandatory tests → coverage (`backend/src/ai/__tests__/narrative.test.ts`, 12 tests, PASS)
diagnosis multi-paragraph · diagnosis multi-page (concatenated, newlines kept) · anamnesis subtitles · course with dates · multiple consultations · multiple imaging · procedures · therapy with drug/dose/freq · partially illegible therapy line (kept integrally) · variable advice · allergy present/absent/not_documented/unclear · **no row generation** (strings, not arrays).

## Removal of the wrong behaviour
The discharge-import narrative output has **no** `diagnoses[]/medications[]/consultations[]/procedures[]` and assigns no ICD / principale / comorbidità / stato — the draft is text-only by construction. Pre-existing manual modules are untouched; only the auto-generation from the letter is removed (the narrative path carries no arrays).

## Suite / build
- backend tests **78/78** (12 new) · `tsc -p backend/tsconfig.json` exit 0.
- data-smoke: GET /patients 200, 19 (backend-only, no regression).

## Note
`_narrative` is produced when the sections pass runs (`AI_SECTIONS_PASS`, REQ-026). Enabling it in prod is a runtime env toggle; the contract + transform are complete and unit-verified here.
