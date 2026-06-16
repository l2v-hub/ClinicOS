# REQ-033 — Real runtime flow (traced before implementing)

## Chain (discharge-letter import, as deployed)
1. PatientList → "Importa dimissione" → `DischargeImportModal` (frontend).
2. Upload: `POST /ai/extraction/jobs` (+ `/files`) → ImportJob.
3. `POST /ai/extraction/jobs/:id/process` → 202; worker `runJob` (backend/src/ai/upload/job-service.ts).
4. `runJob` → AI runtime (Mistral OCR) → `wrapRuntimeResult`/`mergeExtractions` → **resultData = { ...merged (_merge arrays), _full:{anagrafica,cartella}, rawText, _sections:null, _narrative:null }**.
   - `_sections`/`_narrative` are produced ONLY when `process.env.AI_SECTIONS_PASS === 'true'` (job-service.ts:632) — **OFF in prod** → both null.
5. Poll `GET /ai/extraction/jobs/:id` → review_ready; `GET .../result` → resultData.
6. Modal: `isReview && hasSections ? <ImportSectionsReview> : <ImportReviewFull>`. With `_sections` null, `hasSections=false` → **`ImportReviewFull` renders**.

## Root cause of `Diagnosi (36)`
`ImportReviewFull.tsx:282-289` renders `Diagnosi ({diagnosi.length})` + `<table>` with columns **ICD / Descrizione / Tipo / Stato** + `+ Diagnosi`, driven by `_full.cartella.diagnosi[]` (and `merged`), i.e. the legacy structured arrays. Same file renders farmaci as a table.

## Why prior REQs didn't fix the LIVE flow
REQ-026/027/028/029/030 added the narrative path as an **opt-in parallel route** (`AI_SECTIONS_PASS`), never the default. Prod kept `AI_SECTIONS_PASS` unset → legacy `ImportReviewFull` table path remained the one actually mounted.

## Fix (this REQ — replace, not parallel)
- Backend: sections pass **default-ON** (`!== 'false'`) so `_sections`+`_narrative` always produced; `_narrative` always present (fallback derived from `_full`/rawText if the pass yields nothing).
- Frontend: the discharge-import review **always** renders `ImportSectionsReview` (narrative blocks); `ImportReviewFull` is **removed from the import path**. `effectiveSections = _sections ?? deriveSectionsFromExtraction(rawText,_full)` guarantees text blocks even without the pass — never the table.
- Upload step popup widened to match the review (96vw).
- Dev runtime assertion + guard test: import draft must not carry `diagnoses[]/medications[]`; modal must not import `ImportReviewFull`.
