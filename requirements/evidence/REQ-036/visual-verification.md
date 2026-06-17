# REQ-036 — Visual Verification

Issue #48. Branch `req-036-document-reorder-reprocess`. Date 2026-06-17.
App run locally (Podman Postgres + backend :3001 + frontend :5173) via `run-clinicos`.
Driven headless with Playwright Chromium (`.claude/skills/run-clinicos/req036-evidence.mjs`).
Local AI status flipped to available with the built-in `mock` provider (evidence only; `.env`
restored afterwards — no committed env change).

## Iteration log
Single iteration — the UI rendered conformant on first capture (0 console errors).

## Screenshots (committed under requirements/evidence/REQ-036/)
| File | Viewport | Shows | Verdict |
|------|----------|-------|---------|
| `documents-before-reorder.png` | 1366×768 | 3 docs in upload order (pagina1, pagina2, pagina3) with ↑/↓/delete controls | PASS |
| `documents-after-reorder.png` | 1366×768 | after moving #1 down → order is pagina2, pagina1, pagina3; indices renumbered | PASS |
| `return-to-documents.png` | 1366×768 | during Elaborazione ("In coda…", "Elaborazione in corso…") the **← Torna ai documenti** control is present top-left; reordered sequence preserved | PASS |
| `documents-tablet.png` | 1024×768 | documents list + reorder controls render on tablet | PASS |

## Reviewer notes
- **Order actually changes** (criterion 6): the headless run logged
  `order before: pagina1 | pagina2 | pagina3` → `order after: pagina2 | pagina1 | pagina3`.
- **Back available during Elaborazione** (criterion 2): `back-during-processing visible: true`.
- **Back available during Revisione** (criterion 1): the same `.import-modal__back` button renders
  when `isReview` is true; its handler (`reopenToDocuments`) shows the recompute-confirm dialog
  before returning. (The Revisione screen itself needs a successful extraction — see Limitations.)
- Brand: blue medical palette only; no red; no overflow. 0 console errors.

## Live backend integration (no AI runtime needed) — `api-integration-check.txt`
10/10 PASS against the running backend, covering the criteria with no DB unit test:
reorder persisted · double-press `process` → 202 idempotent (not an error) · `reopen` → 200,
same job id (no duplicate), status back to `uploaded`, files kept (no re-upload), previous draft
invalidated (`result.resultData` empty) · reprocess after reopen → 202.

## Limitations (documented, not failures)
- The **Revisione** screen and its recompute-confirm dialog, the new extracted blocks after a
  reorder, and the cross-page section shown in review require a live AI runtime + model, which is
  not available on this local machine (`AI_RUNTIME_URL`/model key absent). These are covered by:
  - cross-page continuity: unit test `REQ-036: section spanning a page break…` (markdown-parse).
  - order reaches extraction: unit test `REQ-036: reordered documents produce a reordered sort_order…`
    plus the backend fix `runJob` now reads documents `orderBy: sortOrder`.
  - draft invalidation / reprocess / no duplicate: live API check above.
- Per-page OCR memoization (reuse already-valid OCR) lives in the separate `clinicos-ai-runtime`
  service; reprocess here reuses the uploaded files (no re-upload, no duplicate job) and only
  re-runs the runtime on explicit reprocess.
