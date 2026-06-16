# REQ-033 — Acceptance matrix

Issue: #40 — *Sostituire realmente il flusso legacy di importazione con sezioni narrative* (BLOCKER; title REQ-033, commit "REQ-028" stale).
Type: **Backend + Frontend**. The narrative import is now the REAL, default, only path — not a parallel route.

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Real runtime path traced | `runtime-flow.md`, `component-trace.md` | PASS |
| 2 | Deployed commit verified | traced to `ImportReviewFull` + opt-in gate; fixed both | PASS |
| 3 | Backend payload has `diagnosisText` | `_narrative` always built (sections or rawText fallback) | PASS |
| 4 | Payload has no `diagnoses[]` (import draft) | narrative draft is array-free; guard test | PASS |
| 5 | UI renders `diagnosisText` | `after-runtime-diagnosis-text.png` | PASS |
| 6 | No `Diagnosi (36)` | negative check passed (no `Diagnosi (`) even with 36-item legacy array in payload | PASS |
| 7 | No ICD/Tipo/Stato columns | `ImportReviewFull` removed from import path; negative check (no `ICD`) | PASS |
| 8–14 | Allergie/Anamnesi/Decorso/Consulenze/Diagnostica/Prestazioni/Terapia/Consigli = text blocks | ImportSectionsReview narrative blocks; `after-runtime-*` shots | PASS |
| 15 | Narrative text not re-split | derived 1:1 from `_narrative` *Text fields; no row splitting | PASS |
| 16 | Upload popup 96vw | `wide-upload-real-component.png` (`.import-modal` widened) | PASS |
| 17 | Review popup 96vw | `wide-review-real-component.png` | PASS |
| 18–19 | Verified on the deployed build | prod verified post-deploy (see deploy verification) | PASS |

## Implementation (replace, not parallel)
- **Backend** `runJob`: sections pass is now **default-ON** (`AI_SECTIONS_PASS !== 'false'`); `_narrative` is **always** present — built from the faithful sections, or from the integral OCR `rawText` (`narrativeFromRawText`) as fallback. The discharge import never depends on the opt-in flag anymore.
- **Frontend** `DischargeImportModal`: the review **always** renders `ImportSectionsReview` (narrative); `ImportReviewFull` (the `Diagnosi (N)` table) is **no longer rendered** in the import path. `effectiveSections = _sections ?? sectionsFromNarrative(_narrative)`. Dev runtime assertion throws `LEGACY_IMPORT_CONTRACT_DETECTED` if the draft carries `diagnoses[]/medications[]/...`. Upload popup widened to 96vw.

## Guards / tests
- `frontend/.../sections/__tests__/import-contract.test.ts` (4): draft→sections mapping (no `diagnoses`), all sections kept, `assertNoLegacyImportArrays` throws on legacy, **GUARD: modal source contains no `<ImportReviewFull>`**.
- backend narrative/sections/patient-narrative 39/39; `tsc` both exit 0; `vite build` ✓.
- E2E negative check: with a 36-item legacy `_full.cartella.diagnosi` in the payload, the rendered review contains none of `Diagnosi (` / `ICD` / `COMORBIDITA` / `+ Diagnosi`.

## Data-smoke
GET /patients 200, 19 (no regression).
