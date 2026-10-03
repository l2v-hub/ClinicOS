# Task Contract

## Task

- Title: UX W3 moduli scale identiche al cartaceo
- Slug: ux-w3-moduli-scale-identiche-al-cartaceo
- Type: change
- Date: 2026-10-03

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |       no |
| Config / Env         |       no |

Agnos: the `assessments.*` tool schema enum gains the new types. Auth: the catalog «Nuova compilazione» is gated by `assessments.create_draft`; there is no server rule change.

## Current Behaviour

The scales differ from the paper forms in `Moduli/*.pdf`:

- wording differs (GDS, Tinetti, MNA);
- MNA is the full MNA with no F2;
- Barthel and UCLA-NPI sleep do not exist;
- on screen the form uses radio cards and the PDF is flowing text.

OSS sees «Nuova compilazione» and then gets a 403.

## Expected Behaviour

Six scales use a paper-table layout on screen and in the PDF, with the same wording, numbering, points, bands and signature as the paper: PAINAD, GDS-15 v2, MNA-SF v2, Tinetti v2, Barthel v1 and UCLA-NPI sleep v1. The new formVersions are registered in the backend, frontend and SQL CHECK constraints. Old versions stay valid and readable.

## Acceptance Criteria

- AC1: Barthel 10 items, max 100, 5 bands as paper; UCLA-NPI freq 0–4 × sev 1–3 (0 if absent) + distress 0–5.
- AC2: GDS-15 v2, Tinetti v2 (28 pts, 1–16 numbering with 8 and 11 sub-rows), MNA-SF v2 (A–F, F1 or F2, max 14) with paper wording and bands.
- AC3: New SQL migration accepts the new (type, formVersion) pairs and validates answers/snapshots; old v1 rows remain valid.
- AC4: Screen form = paper table (all options + points, header band, legend, live total) at 1180x820 and 820x1180.
- AC5: PDF uses the same table layout with selected option ticked, bands box, signature line with author name.
- AC6: Catalog shows Barthel and UCLA-NPI; «Nuova compilazione» hidden without `assessments.create_draft`.
- AC7: Finalized v1 records still open and render.

## Test Plan

| Test type                 | Required | Reason                                      |
| ------------------------- | -------: | ------------------------------------------- |
| Unit                      |      yes | scoring/bands/validation per scale          |
| Integration               |      yes | DB create/finalize/replay on fresh DB       |
| API                       |      yes | via DB service tests                        |
| Playwright                |      yes | compile→finalize→PDF per scale, 2 viewports |
| Persistence after refresh |      yes | finalized record reopened                   |
| Agnos action registry     |      yes | tool enum test                              |
| Voice simulation          |       no |                                             |
| OCR/import test           |       no |                                             |
| Security/privacy scan     |       no |                                             |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots (form vs paper side by side) under artifacts/task-validation/ux-direct-access-cycle/w3/
- PDF renders

## Risks

- CHECK constraint rewrite could reject legacy rows → copy existing constraints verbatim, add only version-scoped branches; DB test with v1 rows.
- MNA v1 → v2 corrections change answer shape → correction of v1 starts an empty v2 draft.

## Gate Status

READY FOR IMPLEMENTATION
