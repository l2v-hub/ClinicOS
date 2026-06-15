# REQ-026 — Visual verification

**Result: N/A — backend-only requirement (no UI surface).**

REQ-026 defines the *backend extraction contract* (faithful clinical sections + semantic
tags + Imola alias profile + allergy-conflict confirm block). It adds **no frontend
component, route, or visual element**. The semantic tags are stored as structured
annotations (offsets, no HTML); rendering bold is a *future frontend* responsibility
(REQ-027 / downstream), explicitly out of scope here ("Il frontend sarà responsabile
della visualizzazione in grassetto").

Because there is no rendered output, screenshots are not applicable. Per the skill's
rule, the detail was derived from the issue itself and the verification is performed at
the contract level instead:

- **Functional verification:** `backend/src/ai/__tests__/sections.test.ts` — 20 tests, all PASS (full suite 66/66).
- **Compile verification:** `tsc -p backend/tsconfig.json` → exit 0.
- **Schema/prompt review:** `clinicos-sections.schema.json` enforces enums/shape; prompt forbids HTML and mandates single-block faithful rawText.
- **Regression:** GET /patients unchanged (19 → 19); the sections pass is opt-in (`AI_SECTIONS_PASS`, default OFF) so the live import flow is untouched.

No fabricated screenshots are attached, by design.
