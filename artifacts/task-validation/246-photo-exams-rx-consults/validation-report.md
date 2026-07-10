# Validation Report — Issue #246 remediation (auth + magic-byte validation on document upload/download)

## Summary
Codex marked #246 **QA FAILED — MISSING OBJECTIVE EVIDENCE** with two concrete security
findings: (1) the 3 patient-document endpoints had no authentication/authorization — anyone who
knew or guessed a `patientId`/`documentId` could upload to, or read the bytes of, any patient's
clinical documents; (2) upload trusted the client-declared multipart `Content-Type` instead of
the real file signature. This pass closes both gaps and adds the missing negative-path coverage.

## What changed
- `backend/src/routes/patient-documents.ts`: `router.use(requireOperator)` (same middleware used
  by `backend/src/routes/ai-actions.ts`) gates all 3 handlers — anonymous → 401, wrong role → 403.
  Ownership (`getPatientDocumentContent` pairs `documentId` with `patientId`) is unchanged, now
  reachable only by an authenticated operator.
- Same file: new exported `sniffAllowedMime(buffer)` checks the real magic bytes (JPEG `FF D8 FF`,
  PNG `89 50 4E 47`, WEBP `RIFF…WEBP`, PDF `%PDF`, HEIC/HEIF `ftyp` @ offset 4) and rejects a
  declared/actual mismatch with `415` **before** `createPatientDocument` runs. Exported
  `MAX_UPLOAD_BYTES` (15 MB, unchanged) makes the multer limit assertable in tests.
- Frontend (`EsamiConsulenzeTab.tsx`, `ImportedDocumentsList.tsx`, `DocumentSourcePanel.tsx`,
  `NarrativeSectionsTab.tsx`, `DocumentiTab.tsx`, `PatientDetail.tsx`, `App.tsx`): `operatorId`/
  `operatorRole` are threaded from `utente.id`/`utente.ruolo` down to every caller of the 3
  document endpoints; every `fetch` now sends `X-Operator-Id`/`X-Operator-Role`. The content
  endpoint (previously a plain `<a href>`/`<img src>`/`<iframe src>`, which cannot carry custom
  headers) is now fetched as an authenticated blob and rendered via `URL.createObjectURL`
  (revoked after use / on unmount).
- New `backend/src/ai/__tests__/patient-documents-security.test.ts`, registered in
  `backend/package.json` "test" script.
- New `e2e/remediation/issue-246.spec.ts` + `e2e/remediation/pw.config.246.ts`.

## AC -> outcome -> evidence
| AC | Outcome | Evidence |
|---|---|---|
| AC1 — allegato in "Esami" | Implemented + covered by Playwright (authenticated upload → 201 + chip) | `e2e/remediation/issue-246.spec.ts` test 1; screenshot `screenshots/result-authenticated-upload.png` (produced when the controller runs the spec against the live stack) |
| AC2 — allegato in "RX" | Implemented + covered, same spec/section loop | same as above |
| AC3 — allegato in "Consulenze" | Implemented + covered, same spec/section loop | same as above |
| AC4 — persistenza + sezione corretta dopo reload | Implemented + covered: reload then assert each chip only in its own section | `e2e/remediation/issue-246.spec.ts` test 1 (post-reload block) |
| AC5 — permessi camera negati → fallback upload | Implemented + covered: `grantPermissions([])` + stubbed rejecting `getUserMedia`, upload via the same `<input type=file>` still succeeds | `e2e/remediation/issue-246.spec.ts` test 3; screenshot `screenshots/result-ac5-camera-denied-fallback.png` |
| AC6 — privacy/security | Implemented: anonymous upload/read → 401 (never 200/500); magic-byte spoof → 415 before persistence; `Cache-Control: private, no-store` kept; no PHI logged | `e2e/remediation/issue-246.spec.ts` test 2 (anonymous 401 x3); `backend/src/ai/__tests__/patient-documents-security.test.ts` (401/403/415 pure-logic coverage) |

## Tests executed in this worktree pass
- `node_modules/.bin/tsx --test backend/src/ai/__tests__/patient-documents-security.test.ts`
  (run with `backend/` as cwd so `dotenv/config` picks up `backend/.env`) — **7/7 PASS**.
- Full backend suite: `npm test` (from `backend/`) — **316/316 PASS**, zero regressions.
- `npm --prefix backend run build` (prisma generate + `tsc`) — **exit 0**.
- `NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend` (`tsc -b && vite build`) —
  **exit 0**.
- `npx playwright test --config e2e/remediation/pw.config.246.ts --list` — parses successfully
  (matches the exact terse `PASS (0) FAIL (0)` output also produced by the already-accepted
  sibling spec `.wt-fix/245/e2e/remediation/pw.config.245.ts --list` in this environment).
- The Playwright spec itself (`issue-246.spec.ts`) is **authored, not executed** in this pass —
  no local stack (Postgres/backend/frontend) is running in this worktree. Per the shared
  remediation contract, the controller executes it later against the live stack and produces
  `screenshots/`, `trace.zip`, `playwright-report/`, `test-results/`, `video/`.

## CI disposition
Not evaluated in this pass (no CI run triggered from the worktree). Per the shared brief, the
Azure SWA "Build and Deploy Job" check is known to fail repo-wide due to a shared infra token
issue unrelated to any single PR's code — documented here as baseline noise pending an
infrastructure-side fix, not attributable to this change.

## Notes / risks
- All 5 frontend call sites of the 3 gated endpoints (`EsamiConsulenzeTab`,
  `ImportedDocumentsList`, `DocumentSourcePanel`, and their parents `DocumentiTab`,
  `NarrativeSectionsTab`, `PatientDetail`, `App`) were updated in this pass to avoid a
  regression where existing previews (imported-documents list, OCR "vai alla fonte" narrative
  compare) would have silently broken once the backend started requiring auth.
- Ownership check (`getPatientDocumentContent`'s `findFirst({ id, patientId })` → null → 404) is
  DB-backed and not re-tested in the pure-logic unit suite (documented inline in the test file);
  it is unchanged by this pass and was already correct — only now reachable exclusively by an
  authenticated operator.

La stringa "CLOSED — VERIFIED" viene apposta da Codex dopo verifica indipendente, come da
handoff #239.

Final Decision: READY FOR CODEX QA
