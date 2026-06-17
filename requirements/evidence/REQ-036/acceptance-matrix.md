# REQ-036 — Acceptance Matrix

Issue #48 — Consentire ritorno, riordinamento e riprocessamento dei documenti.
Branch `req-036-document-reorder-reprocess`. Date 2026-06-17.

## Pre-existing (already in codebase before this REQ)
- Multi-file upload job (`DischargeImportModal`, `/ai/extraction/jobs`).
- Per-doc reorder ↑/↓ → `POST /:id/reorder` → `reorder()` persists `sortOrder`.
- Per-doc delete → `DELETE /:id/files/:docId`.
- Retry on failure → `POST /:id/retry` (status `failed`/`retryable_error` only).
- Files persisted on disk per job; survive backend restart.
- Cross-page narrative continuity: `parseMarkdownSections` accumulates text until the next
  *different* canonical heading — page breaks (non-heading lines) never close a section.

## Gaps this REQ closes
| # | Acceptance criterion | Method | Route/Page | Initial | Final | Evidence |
|---|----------------------|--------|-----------|---------|-------|----------|
| 1 | `Torna ai documenti` available during Revisione | manual+unit | Review step | absent (only internal `onBack` w/o reopen) | PASS | back-button FE + reopen |
| 2 | `Torna ai documenti` available during Elaborazione | manual | Processing | absent | PASS | back-button FE |
| 3 | Files not lost on going back | unit | reopen | n/a | PASS | reopen keeps documents+disk |
| 4 | Order can be modified | manual | Upload | PASS | PASS | move() |
| 5 | Order persisted in backend | unit | reorder | PASS | PASS | reorder() sortOrder |
| 6 | **New order actually used by extraction** | unit | runJob | **FAIL (runJob ignored sortOrder)** | PASS | runJob orderBy sortOrder |
| 7 | Reprocess without re-upload | unit | reopen+process | **FAIL (enqueue blocked at review_ready)** | PASS | reopenJob → uploaded |
| 8 | Valid OCR reused | n/a | runtime | PARTIAL | PARTIAL | files reused (no re-upload); per-page OCR cache lives in AI runtime — out of scope, documented |
| 9 | Previous draft invalidated | unit | reopen | FAIL | PASS | reopen clears resultData/model |
| 10 | Sections continue to next page | unit | parser | PASS | PASS | parseMarkdownSections test |
| 11 | Page end does not close section | unit | parser | PASS | PASS | parseMarkdownSections test |
| 12 | Reprocess does not duplicate job | unit | reopen+process | PASS | PASS | same jobId reused |
| 13 | Double press does not start two runs | unit | enqueue | PARTIAL (2nd threw) | PASS | idempotent enqueueJob + single-flight worker atomic claim |
| 14 | After reprocess the form has new correct blocks | manual | Review | n/a | PASS | reorder→reprocess→review |

## Out of scope / documented limitations
- (8) True per-page OCR result caching is implemented inside the separate `clinicos-ai-runtime`
  Python service (not in this repo). Reprocess **reuses the already-uploaded files** (no re-upload,
  no duplicate job) and only re-runs the runtime when the user explicitly reprocesses. Per-page OCR
  memoization is a runtime-side optimization tracked separately.
- New job `status` strings (`reordering`/`reprocessing`) are NOT added — the REQ allows
  "stati equivalenti". Reopen reuses the existing `uploaded` state (editable phase) and
  `queued`/in-flight states for reprocessing, avoiding a schema/enum migration.
