# REQ-028 — Visual verification

**Result: N/A as UI — backend contract requirement.**

REQ-028 changes the discharge-letter import OUTPUT CONTRACT (structured arrays → flat
narrative text). It adds no frontend/UI surface, so no screenshots are produced (none
fabricated). The downstream rendering of the narrative draft is REQ-029/030/031 (separate
issues).

Verification is at the contract level:
- `backend/src/ai/__tests__/narrative.test.ts` — 12 tests, PASS (full suite 78/78).
- `tsc -p backend/tsconfig.json` → exit 0.
- AJV validation against `clinicos-discharge-narrative.schema.json` (`clinicos-discharge-narrative-v1`).
- Key invariant proven: each clinical section is a single `*Text` string; the draft contains
  no `diagnoses[]/medications[]/consultations[]`; boldTags are offset annotations whose
  `text === field.slice(start,end)` (text never modified).
- Regression: GET /patients 200, 19 (backend-only, additive).
