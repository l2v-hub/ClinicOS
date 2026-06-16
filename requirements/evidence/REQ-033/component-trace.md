# REQ-033 — Component trace

| Symptom | Source |
|---|---|
| `Diagnosi (36)` + ICD/Tipo/Stato table | `frontend/src/components/shared/ImportReviewFull.tsx:282-289` (diagnosi `<table>`) |
| Farmaci table | `ImportReviewFull.tsx:294` |
| Which review renders | `DischargeImportModal.tsx` ternary `isReview && hasSections ? ImportSectionsReview : ImportReviewFull` |
| `hasSections` false in prod | `resultData._sections` null because `runJob` gates the sections pass on `AI_SECTIONS_PASS === 'true'` (job-service.ts:632), unset in prod |
| Legacy arrays origin | `wrapRuntimeResult` → `mergeExtractions` (merge.ts) builds `_merge` + `_full.cartella.diagnosi[]` from the model's structured extraction |

## Files changed by REQ-033
- backend/src/ai/upload/job-service.ts — sections pass default-on + always-present `_narrative`.
- frontend/src/components/shared/DischargeImportModal.tsx — always narrative review; remove ImportReviewFull from import path; widen upload popup; dev assertion.
- frontend/src/components/shared/sections/deriveSections.ts — fallback SectionsResult from rawText/_full.
- frontend/src/app-additions.css — wide upload popup.
- guard test.
