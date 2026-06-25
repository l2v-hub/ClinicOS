# BUG-048 (issue #70) — Production verification verdict

Date: 2026-06-25 · Verifier: read-only prod verification (no source/GitHub changes; no real patient written)

## Verdict: PASS

The "Confronta con il documento / con la fonte" (compare with original) fix for BUG-048 is LIVE on prod.

- backend_fix_live_on_prod: **YES**
- frontend_fix_live_on_prod: **YES**

## What was tested (real tool calls)

1. Source read: `parseNarrativeFromMarkdown` (backend/src/ai/sections/markdown-parse.ts:96-136)
   emits `sourceReferences` per populated section when given the document info. Wired in
   job-service runJob (backend/src/ai/upload/job-service.ts:708). FE consumers:
   frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx (compare panel +
   onCompareSource), .../shared/sections/ImportSectionsReview.tsx ("Confronta con la fonte"),
   .../shared/sections/deriveSections.ts (sourceReferences -> sourceRanges).
2. Commit 996d41b confirmed authored 2026-06-21, present on `main`, touches markdown-parse.ts
   + job-service.ts (the BUG-048 hunk at line 125-134).
3. SYNTHETIC import driven through prod **backend API** (operator headers) end-to-end to
   `review_ready`, then GET /result inspected. STOPPED before /confirm — no real patient created.
4. Stale prod FE bundle (index-CQEFE1oX.js, Last-Modified 22 Jun) string-scanned for the
   compare-panel logic.
5. SYNTHETIC import driven through prod **UI** (Playwright) to the review screen at desktop
   1366x768 and tablet 1024x768. PHI-safe (modal-only screenshots). No create.

## Backend evidence (definitive)

`backend-api-result.json`: prod job `cmqtnpv7e...` reached `review_ready` (model
mistral:mistral-document-ai-2505) and `_narrative.sourceReferences` contained **6 non-empty
refs**, one per populated section, each with fileId + fileName:
DIAGNOSI, ANAMNESI, DECORSO_OSPEDALIERO, TERAPIA, CONSIGLI_E_CONTROLLI, ALLERGIE.

Before the fix this array was `[]`. Non-empty on prod => backend fix is live.

## Frontend evidence

`frontend-bundle-scan.txt`: deployed bundle contains "Confronta con il documento", "Confronta
con la fonte", "Vai alla fonte", and the consuming logic
`onCompareSource: t||(displayText).trim()?()=>u({fileName:t?.fileName,page:t?.pageFrom,...})`
plus `sourceReferences??[]` readers. BUG-048 was a backend DATA gap (empty refs), not a missing
FE feature; the FE consumer predates the 22 Jun bundle, so the stale FE is not a blocker here.

UI screenshot (`review-desktop.png`): prod review screen, synthetic patient, Allergie card shows
"Fonte: dimissione-sintetica-test.pdf" + "Vai alla fonte"; document-original preview pane present.

## Per acceptance criterion

| Criterion | Result | Evidence |
|---|---|---|
| Diagnosi opens source | PASS | sourceReferences has DIAGNOSI ref (backend-api-result.json); FE button + consumer in bundle |
| Anamnesi opens source | PASS | sourceReferences has ANAMNESI ref |
| Terapia opens source | PASS | sourceReferences has TERAPIA ref (populatedSections includes therapyText) |
| Allergie opens source | PASS | sourceReferences has ALLERGIE ref; "Vai alla fonte" visible in review-desktop.png |
| Correct page shown | PARTIAL / NOT-FULLY-VERIFIABLE | markdown path sets fileId/fileName but omits pageFrom by design (viewer opens the document; exact page is best-effort) — see code comment markdown-parse.ts:126 |
| Document accessible after refresh / new login | NOT-VERIFIED (read-only) | Not exercised — would require confirming a patient (real write) to test the persisted patient-narrative path; refused per PHI rules. Import-review path verified live. |
| No new AI processing to compare | PASS | compare uses stored sourceReferences + already-extracted text; no extra model call (parseNarrativeFromMarkdown is deterministic, no AI) |
| Desktop 1366x768 | PASS | review-desktop*.png reachedReview=true, 0 console errors |
| Tablet 1024x768 | PASS | review-tablet*.png reachedReview=true, 0 console errors |

## Evidence files (requirements/evidence/BUG-048/prod-verify/)

- backend-api-result.json — prod job result with 6 non-empty sourceReferences
- frontend-bundle-scan.txt — deployed-bundle string scan + minified consumer logic
- review-desktop.png / review-desktop-1.png / -2.png — prod UI review, desktop 1366x768
- review-tablet.png / review-tablet-1.png / -2.png — prod UI review, tablet 1024x768
- before-upload-desktop.png / before-upload-tablet.png — upload modal (synthetic)
- dimissione-sintetica-test.pdf — synthetic input document

## Blockers / caveats

- None blocking. The known "stale FE bundle (22 Jun)" is NOT a blocker for BUG-048 because the
  compare-panel FE code is already in that bundle.
- Two criteria not fully observed by design/safety: exact-page targeting (markdown path omits
  pageFrom intentionally) and after-refresh persistence on a saved patient (not tested — would
  require a real patient write, refused per PHI rules). The live import-review compare path and
  the per-section source links are confirmed working on prod.
