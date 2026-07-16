# Task Contract

## Task
- Title: 267 ci browser e2e req020
- Slug: 267-ci-browser-e2e-req020
- Type: bugfix
- Date: 2026-07-16
- Issue: https://github.com/l2v-hub/ClinicOS/issues/267
- Failing run: https://github.com/l2v-hub/ClinicOS/actions/runs/29437486520 (attempts 1 and 2, job `browser-e2e`)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no (build-time env only) |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no (CI path only) |
| Auth / Permissions | no |
| Privacy / Security | yes (CI was sending synthetic uploads to the production backend) |
| Config / Env | yes (workflow env + root devDependency) |

## Current Behaviour

Root-cause diagnosis from the run 29437486520 logs (both attempts) and the
`ai-import-e2e-screenshots` artifacts:

1. **The CI browser talked to the PRODUCTION backend, not the local mock stack.**
   `frontend/src/config.ts` (commit `6e6ccca`, "HOTFIX: prod build always falls back
   to real backend URL") makes a production Vite build fall back to
   `https://clinicos-backend-production-df88.up.railway.app` whenever `VITE_API_URL`
   is unset. The `browser-e2e` job builds the frontend with `npm run build` and no
   `VITE_API_URL`, so the preview bundle pointed at prod. Evidence chain:
   - the UI created and polled an import job (screenshot shows the two synthetic
     documents and the `retryable_error` message from `DischargeImportModal` polling),
   - yet the **local** DB dump printed `[]` for `prisma.importJob.findMany` and the
     **local** AI runtime log contains a single `/v1/runtime/health` request and no
     `/v1/document-jobs` call — the job never existed locally,
   - `retryable_error` is the exact status the poller maps to
     "Errore temporaneo durante l'elaborazione…".
   The job previously appeared green only because the production extraction happened
   to succeed; it now fails deterministically because prod returns `retryable_error`.
2. **Playwright is not a declared dependency.** The install step first runs
   `node node_modules/playwright/cli.js …`, which fails with `MODULE_NOT_FOUND`, then
   falls back to an unpinned `npm i --no-save playwright` (AC1 violation).
3. The `browser-e2e` job carries `continue-on-error: true`, so the failed job was
   reported as an overall-green run, hiding the error (issue: "il job termina verde
   senza nascondere errori").

## Expected Behaviour

- The `browser-e2e` job builds the frontend with `VITE_API_URL=http://localhost:3001`
  so the browser drives the local backend + mock AI runtime (hermetic CI, no traffic
  to production).
- Playwright is a pinned root devDependency installed from the lockfile; the install
  step is a single deterministic invocation with no fallback and no MODULE_NOT_FOUND.
- REQ-020 desktop and tablet reach the review (`srev-PATIENT_DEMOGRAPHICS` visible),
  the local mock runtime receives `/v1/document-jobs` calls, and the job is green
  without `continue-on-error` masking.

## Acceptance Criteria

- AC1: the Playwright step emits no `MODULE_NOT_FOUND` and installs the CLI from the lockfile.
- AC2: REQ-020 desktop reaches the review and `srev-PATIENT_DEMOGRAPHICS` is visible.
- AC3: REQ-020 tablet reaches the review and `srev-PATIENT_DEMOGRAPHICS` is visible.
- AC4: no "Errore temporaneo durante l'elaborazione" and no unexpected 4xx/5xx on the path.
- AC5: the mock runtime receives at least one document-job call; the assert step passes.
- AC6: `secret-scan`, `gate`, `real-provider`, build and existing tests stay green.
- AC7: the full GitHub Actions run on the PR SHA finishes green; nothing skipped.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | focused failing reproduction: workflow-config assertions (RED before fix, GREEN after) |
| Integration | no | |
| API | no | (gate job's API E2E already covers the local import path and stays green) |
| Playwright | yes | REQ-020 desktop+tablet must pass in the GitHub runner (authoritative validation) |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | yes | exercised by the browser-e2e job itself against the mock runtime |
| Security/privacy scan | yes | secret-scan job must stay green; no secrets in logs |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (RED/GREEN of the workflow-config reproduction, build logs)
- sanitized CI logs of run 29437486520 (failure) and of the green run on the PR SHA
- screenshots/ desktop + tablet of the successful review (from Actions artifacts)
- test-results/ with commands and exit codes
- binding to the exact PR commit SHA and Actions run URL

## Risks

- The hermetic path (local mock stack) is the same one the `gate` job's API E2E already
  exercises green, so the browser flow should be deterministic; removing
  `continue-on-error` makes any future regression visible instead of masked.
- Playwright version is pinned via the lockfile; browser download happens in CI via
  `install --with-deps chromium` as before.

## Addendum — residual root cause (commit 83f6afd, 2026-07-16)

The two earlier fixes (`92d5b88`: `VITE_API_URL=http://localhost:3001`; lockfile Playwright
install) removed the `MODULE_NOT_FOUND` and the "silently drives production" causes, so the flow
reached the **Revisione** step on run 29480138060 — but `browser-e2e` stayed red with
`req020-desktop: created=false` / `req020-tablet: created=false`, `consoleErrors=0`.

Diagnosis from the run 29480138060 `--log-failed` output and the `ai-import-e2e-screenshots`
artifact (`req020-*-FAIL-not-created.png`): the failure screenshot shows the **"Nuovo paziente"
intake wizard stuck at step "3. Clinica"** with the therapy checkbox and
"Stato allergie non documentato — seleziona uno stato".

The E2E script `e2e/import-happy-path.mjs` was **stale relative to the F5 #124 flow**. Since #124,
`ImportSectionsReview`'s "Crea paziente" no longer creates the patient directly:
`DischargeImportModal.handleProceedToWorkspace` seeds an intake draft and hands off to the 6-step
`IntakeWorkspace`, which opens at **step 3 (Clinica)**. The patient is created only at **step 6
(Verifica)**, after the two `#235` acceptance gates — `accept-therapy` (Clinica) and
`accept-demographics` (Verifica). The old test clicked "Crea paziente" once, landed on step 3, and
asserted the patient name in the DOM, so `created=false` every run. The allergy message is advisory
(`StepVerifica.canCreate` does not require an allergy state) — not a creation gate.

Fix (test-only, `e2e/import-happy-path.mjs`): after the review's "Crea paziente", check
`accept-therapy` (step 3), advance 3→4→5→6 via "Avanti →", check `accept-demographics` (step 6),
click "Crea paziente", then wait for the intake header to detach (onCreated → onClose) before
asserting the new patient in the refreshed list — at desktop (1366×768) and tablet (1024×768).
No job disabled, no `continue-on-error`, no skipped assertion, no timeout inflation.

## Gate Status

READY FOR IMPLEMENTATION
