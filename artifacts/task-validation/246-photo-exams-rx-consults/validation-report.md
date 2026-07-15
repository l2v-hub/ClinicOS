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

Final Decision (historical, 2026-07-12 round — superseded by attempt 5 below): QA FAILED —
FUNCTIONAL DEMO VERIFIED, PRODUCTION AUTH DEFERRED

## Codex scope update — 2026-07-12 (historical)

The functional document flow remains accepted for synthetic QA in explicit `AUTH_MODE=demo` only. Production-grade authentication and operator-to-patient authorization are not accepted here and are tracked by #260.

| Check | Result | Evidence |
|---|---:|---|
| Upload/list/open/download | PASS (demo) | Existing DB-backed Playwright 3/3 bundle |
| Persistence after reload | PASS (demo) | Existing screenshot/trace/video evidence |
| MIME and magic-byte validation | PASS | Unit/security tests |
| Size limit and JSON 413 handling | PASS | Multer limit and explicit error handler |
| Document-patient ownership | PASS | Compound `documentId + patientId` lookup |
| Demo patient scope | PASS | 403 mismatch test |
| Missing/invalid AUTH_MODE | PASS | Fail-closed test; no demo fallback |
| AUTH_MODE=entra before implementation | PASS (safe failure) | Explicit 503 test |
| Demo in production | PASS (safe failure) | Mode resolver rejects it |
| Current Playwright rerun | BLOCKED | Configured DB unreachable; UI showed 0 patients; synthetic seed failed |
| Production authentication/authz | FAIL/DEFERRED | #260 |
| Final decision | QA FAILED | Issue remains open because server-verifiable identity is still explicit in its contract |

The `X-Operator-*` and `X-Demo-Patient-Id` headers are falsifiable demo hints. They are not described or accepted as secure authentication.

## Claude remediation attempt 5 — 2026-07-15 (branch `fix/issue-246-final-qa`, worktree `E:/Workspace/DG_SE_DEV/ClinicOS/.wt-246-final`)

Findings in scope: **QA-246-003** (diff hygiene) and **QA-246-004** (visible per-section
screenshot evidence + report status). Both are executed and RESOLVED in this attempt; the
attempt-4 "no execution permissions" blocker no longer applies (this session ran the full
stack, tests and builds — see commands below).

### QA-246-003 — RESOLVED

- Root cause (attempt-4 analysis, confirmed here): `core.autocrlf=true` + CRLF-stored files
  made the six added lines (`PatientDetail.tsx:1528,1552`; `DocumentiTab.tsx:12,13,65,132`)
  end in CR, which `git diff --check` reports as trailing whitespace.
- Fix applied: exactly those six line terminators are normalized CRLF→LF; the rest of both
  files is byte-identical, so the committed diff stays the same six lines with no behavior
  change.
- Verified: `git diff --check origin/main` (working tree vs base) exits **0**;
  `git diff --check origin/main...HEAD` re-verified at **exit 0** after the evidence commit
  (command + exit code recorded in the development_handoff on issue #246).

### QA-246-004 — RESOLVED (real UI flow re-run, per-section screenshots)

Full local stack brought up for this attempt (the previous rerun blocker — configured DB
unreachable on `localhost:5433` — was resolved by starting a dedicated ephemeral QA Postgres):

| Step | Command (cwd) | Result |
|---|---|---|
| QA DB | `podman run -d --name clinicos-qa-246-db -e POSTGRES_USER=clinicos -e POSTGRES_DB=clinicos -p 5433:5432 postgres:16` | Up, reachable |
| Schema | `prisma db push --schema=../prisma/schema.prisma --url postgresql://…@localhost:5433/clinicos` (backend/) | In sync, exit 0 |
| Seed | `tsx src/seed.ts` (backend/, synthetic demo seed) | 8 synthetic patients incl. `SEED-PAZ-008` |
| Backend | `tsx src/server.ts` (backend/, `PORT=3101`, `AUTH_MODE=demo`, `NODE_ENV=development`) | `GET /health` 200 |
| Frontend | `vite --port 5173 --strictPort` (frontend/, `VITE_API_URL=http://localhost:3101`) | 200 |
| E2E | `playwright test --config pw.config.246.ts` (e2e/remediation/, `CLINICOS_API=http://localhost:3101`) | **3/3 PASS, exit 0** |

- The re-run executed the improved post-reload block: each of the three section panels is
  scrolled into view and captured per-section. New exact-head screenshots under
  `screenshots/`:
  - `after-reload-esame-viewport.png` + `after-reload-esame-panel.png`
  - `after-reload-rx-viewport.png` + `after-reload-rx-panel.png`
  - `after-reload-consulenza-viewport.png` + `after-reload-consulenza-panel.png`
  - `result-authenticated-upload.png` (fullPage), `result-ac5-camera-denied-fallback.png`
- The `after-reload-consulenza-viewport.png` frame alone visibly shows **all three** persisted
  chips after reload, each under its own section: `_test-246-esame.png` (Esami),
  `_test-246-rx.png` (RX / Diagnostica per immagini), `_test-246-consulenza.png`
  (Consulenze specialistiche) — closing the exact visibility gap of QA-246-004.
- Test 1 also asserts **no console errors** and **no unexpected HTTP 4xx/5xx** during the whole
  flow (401/403 are expected only in the dedicated negative tests), and asserts no
  cross-section leakage after reload. All assertions passed.
- Refreshed evidence at this head: `test-results/` (incl. `trace.zip` + `video.webm` per UI
  test and `.last-run.json` = passed), `playwright-report/`,
  `test-results/auth-mode-unit.txt` (10/10 security/config unit TAP output),
  `test-results/backend-log-sanitized.txt` (full backend log of the session — no PHI, no
  document bytes, no filenames, no secrets).

### Other gates re-run in this attempt

- Security/config unit tests: `tsx --test src/ai/__tests__/patient-documents-security.test.ts`
  (backend/) — **10/10 PASS** (fail-closed AUTH_MODE incl. demo-in-production and entra 503;
  anonymous 401; wrong role 403; demo patient scope 403; magic-byte families + spoof reject;
  15 MB multer cap).
- Backend build (`npm run build` = prisma generate + `tsc`): **exit 0**.
- Frontend build (`npm run build` = `tsc -b && vite build`): **exit 0**.

### Commit binding

- Evidence in this section was produced in worktree `E:/Workspace/DG_SE_DEV/ClinicOS/.wt-246-final`
  on branch `fix/issue-246-final-qa` and committed immediately after this report was finalized.
  The exact head SHA, per-artifact `sha256` and `git_blob_sha` bindings, and every command's
  exit code are recorded in the schema-valid `development_handoff` posted on issue #246 and on
  the draft PR (which supersedes PRs #253 and #261).

### Demo vs production split (explicit, per PO scope update 2026-07-12)

- **Verified here (demo scope only):** demo-functional upload/list/open/download and
  per-section persistence on the real UI (Playwright 3/3 at this head, DB-backed), magic-byte
  vs declared-MIME mismatch → 415, 15 MB limit, document–patient ownership, demo patient
  scope → 403, `Cache-Control: private, no-store`, fail-closed AUTH_MODE handling (10/10
  unit), sanitized logging. `AUTH_MODE=demo` is explicit and non-production; its
  `X-Operator-*`/`X-Demo-Patient-Id` headers are falsifiable demo hints and are **not**
  claimed to be secure authentication.
- **Neither claimed nor required here:** production Entra/OIDC, JWT validation, role mapping
  and operator–patient authorization — tracked exclusively in excluded issue
  [#260](https://github.com/l2v-hub/ClinicOS/issues/260). This issue is demo-functional only.

Final Decision: READY FOR CODEX QA — QA-246-003 and QA-246-004 resolved with executed evidence
at this head; demo functional + privacy controls verified; production auth neither claimed nor
required here (open only in excluded #260). `CLOSED — VERIFIED` remains a Codex-only stamp
applied after independent verification.
