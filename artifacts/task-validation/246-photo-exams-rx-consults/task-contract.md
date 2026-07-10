# Task Contract — Issue #246 remediation (QA FAILED: unauthenticated document upload/download)

## Issue + PR refs
- GitHub Issue: #246 "Foto per Esami, RX e Consulenze"
- QA disposition: Codex marked **QA FAILED — MISSING OBJECTIVE EVIDENCE** / security gap.
- Prior evidence (superseded, kept for history): `artifacts/task-validation/246-foto-esami-rx-consulenze/`
- Branch: `fix/issue-246-foto` · Worktree: `.wt-fix/246`

## Current Behaviour (concrete)
- `backend/src/routes/patient-documents.ts` mounts 3 handlers (`POST /:patientId/documents`,
  `GET /:patientId/documents`, `GET /:patientId/documents/:documentId/content`) with **no**
  `requireOperator` gate. Any caller who knows/guesses a `patientId`/`documentId` (both are
  Prisma `cuid`s, not secret) can upload a file to any patient's chart or read any patient's
  document bytes with a bare unauthenticated HTTP request.
- Upload only checks `file.mimetype`, which is the **client-supplied** `Content-Type` on the
  multipart part — never inspected against the actual bytes. A `.exe`/script renamed with a
  `image/png` content-type is accepted and stored/served back as `image/png`.
- No backend test file covers this router at all (`backend/src/ai/__tests__/` had no
  `patient-documents*` test). No Playwright spec exercised unauthenticated access, cross-patient
  access, oversize rejection, or MIME spoofing.
- Frontend (`EsamiConsulenzeTab.tsx` `SectionPhotos`, `ImportedDocumentsList.tsx`,
  `DocumentSourcePanel.tsx`) calls these endpoints with plain `fetch`/`<a href>`/`<img src>`/
  `<iframe src>` — no operator identity is sent, matching (and depending on) the absence of a gate.

## Expected Behaviour (concrete)
- All 3 document routes require a valid operator identity via the existing `requireOperator`
  middleware (`backend/src/ai/auth.ts`, header-based role gate already used by
  `backend/src/routes/ai-actions.ts`): anonymous → 401, unknown/forbidden role → 403.
- Ownership check already exists in `getPatientDocumentContent` (`findFirst({ id, patientId })`
  returns null → 404 route-side) — kept, now reachable only by an authenticated operator.
- Upload sniffs the real file signature (magic bytes) and rejects (`415`) any mismatch between
  the declared/allowed MIME family and the actual bytes, **before** `createPatientDocument` is
  called (no bad bytes ever reach Postgres).
- Frontend sends `X-Operator-Id` / `X-Operator-Role` on every call to these 3 endpoints; the
  content endpoint (used for inline preview/open, which cannot carry custom headers via
  `<a>`/`<img>`/`<iframe>`) is fetched as an authenticated blob and opened/rendered via
  `URL.createObjectURL`, revoked after use.
- Negative-path unit tests + a Playwright spec cover: 401 anonymous, 403 wrong-role, 201 valid
  operator, 415 MIME-spoof, oversize (multer limit), and AC5 (camera permission denied → file
  picker fallback still uploads).

## Acceptance Criteria (from issue, verbatim + how asserted)
- **AC1** — allegato in "Esami": Playwright uploads a synthetic image with `documentType=esame`
  as an authenticated operator → `expect` 201 + chip visible in `[data-testid="photos-esame"]`.
- **AC2** — allegato in "RX": same flow, `documentType=rx` → chip in `photos-rx`.
- **AC3** — allegato in "Consulenze": same flow, `documentType=consulenza` → chip in
  `photos-consulenza`.
- **AC4** — persistenza + sezione corretta dopo reload: `page.reload()` then re-assert each chip
  is still present in its own section only (no cross-section leakage).
- **AC5** — permessi camera negati → fallback upload funziona: `context.grantPermissions([])` +
  `addInitScript` stubbing `navigator.mediaDevices.getUserMedia` to reject → file-picker path
  (the underlying `<input type=file>`) still completes the upload → 201 + chip visible +
  screenshot.
- **AC6** — privacy: no PHI/secrets logged; unauthenticated/cross-role calls get 401/403 (not
  500/200); no public/permanent URL for document bytes; `Cache-Control: private, no-store` kept.

## Impact table
| Area | Impacted | Note |
|---|---|---|
| Frontend | yes | 3 files: `EsamiConsulenzeTab.tsx`, `ImportedDocumentsList.tsx`, `DocumentSourcePanel.tsx`, `NarrativeSectionsTab.tsx`, `DocumentiTab.tsx`, `PatientDetail.tsx`, `App.tsx` — thread `operatorId`/`operatorRole` down to every caller of the 3 document endpoints; blob-fetch for inline preview/open. |
| Backend | yes | `backend/src/routes/patient-documents.ts` gains `requireOperator` + magic-byte sniffing before persistence. |
| DB | no | No schema/migration change; `PatientDocument` model untouched. |
| API | yes | Same routes/shapes; new 401/403 (auth) and 415 (magic-byte mismatch) response paths. Existing 201/200/404/500 shapes unchanged. |
| Privacy | yes | Closes an unauthenticated-access + cross-patient-access gap on clinical document bytes (PHI: photos/RX/consult scans). No logging of PHI added. |

## Test Plan
| Test | Reason |
|---|---|
| `backend/src/ai/__tests__/patient-documents-security.test.ts` (node:test) | Pure-logic coverage of the gate (401/403/pass, mirroring `security.test.ts` pattern) and of the exported `sniffAllowedMime` magic-byte function (PNG/JPEG/WEBP/PDF/HEIC positive, spoofed-PNG negative → null), since spinning a full Express+Prisma server in a unit test is out of scope/slow. |
| `npx playwright test --config e2e/remediation/pw.config.246.ts --list` (parse-only now; controller executes later) | Confirms the authored spec is syntactically valid and matches the shared harness contract; the real stack isn't up in this worktree pass. |
| Manual grep of route file post-edit | Confirms `requireOperator` sits before all 3 handlers and the sniff runs before `createPatientDocument`. |

## Risks (concrete)
- **Breaking existing previews**: `DocumentSourcePanel`/`ImportedDocumentsList`/`NarrativeSectionsTab`
  render document bytes via `<img src>`/`<iframe src>` pointing straight at the (now-gated)
  content endpoint — browsers cannot attach custom headers to those requests. Mitigated by
  switching those consumers to fetch-as-blob + `URL.createObjectURL` before rendering.
- **Silent 401 regressions for existing callers not yet updated**: any other caller of
  `/patients/:id/documents*` not covered by this pass would start failing. Grepped the full
  frontend tree for all call sites (5 files) and updated all of them.
- **Magic-byte false negatives** for legitimate but slightly non-standard PDFs/HEIC variants:
  mitigated by checking common signatures per format family (not a single fixed offset for all).
- CI: Azure SWA "Build and Deploy Job" fails repo-wide due to a shared infra token issue,
  unrelated to this change — documented as baseline noise.

## QA surface chosen
Real UI flow (Esami & Consulenze tab) driven by Playwright as an authenticated operator, plus
direct unauthenticated `APIRequestContext` calls for the negative paths (401) — no new internal
QA-only surface needed since the feature already has a production UI.
