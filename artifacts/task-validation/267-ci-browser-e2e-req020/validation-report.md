# Task Validation Report — Issue #267 (CI browser-e2e REQ-020)

## Task
- Title: CI browser-e2e (REQ-020) green on the PR SHA
- Slug: 267-ci-browser-e2e-req020
- Issue: https://github.com/l2v-hub/ClinicOS/issues/267
- PR: https://github.com/l2v-hub/ClinicOS/pull/268 (branch `fix/issue-267-ci-browser-e2e`, base `origin/main`)
- Fix commit: `83f6afd1c97b34b92a76567d975f5b50b7ed8b21`
- Green run: https://github.com/l2v-hub/ClinicOS/actions/runs/29505031086
- Date: 2026-07-16

## Implementation Summary

The earlier commits on this branch (`92d5b88`: pin `VITE_API_URL=http://localhost:3001`;
lockfile-installed Playwright) had already fixed the `MODULE_NOT_FOUND` and the "browser silently
drives production" causes, so the flow reached the **Revisione** step — yet `browser-e2e` stayed red
(`req020-*: created=false`).

Residual root cause: `e2e/import-happy-path.mjs` was **stale relative to the F5 #124 flow**. Since #124,
`ImportSectionsReview`'s "Crea paziente" no longer creates the patient directly —
`DischargeImportModal.handleProceedToWorkspace` seeds an intake draft and hands off to the 6-step
`IntakeWorkspace`, which opens at **step 3 (Clinica)**. The patient is created only at **step 6
(Verifica)**, after the two `#235` acceptance gates: `accept-therapy` (Clinica) and
`accept-demographics` (Verifica). The old test clicked "Crea paziente" once, landed on step 3, and
asserted the patient name in the DOM, so `created=false` every run. The allergy message
("Stato allergie non documentato") is advisory — `StepVerifica.canCreate` does not require an allergy
state, so it is not a creation gate.

Fix (test-only, no product/workflow change): drive the real happy path to completion — accept therapy
(step 3), advance 3→4→5→6 via "Avanti →", accept anagrafica (step 6), click "Crea paziente", then wait
for the intake modal header to detach (onCreated → onClose) as the positive creation signal before
asserting the new patient in the refreshed list, at desktop (1366×768) and tablet (1024×768).
No job disabled, no `continue-on-error`, no skipped assertion, no timeout inflation.

## Files Changed
- `e2e/import-happy-path.mjs` (+31 / −3): drive the intake wizard to patient creation (commit `83f6afd`).

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — no `MODULE_NOT_FOUND playwright/cli.js` | PASS | `test-results/browser-e2e-job.sanitized.txt` — `node node_modules/playwright/cli.js install` downloads Chromium, no MODULE_NOT_FOUND, no npm fallback |
| AC2 — desktop reaches review, `srev-PATIENT_DEMOGRAPHICS` visible | PASS | `screenshots/req020-desktop-2-review.png` (Revisione, Anagrafica form); log `req020-desktop: created=true` |
| AC3 — tablet reaches review, `srev-PATIENT_DEMOGRAPHICS` visible | PASS | `screenshots/req020-tablet-2-review.png` (Dati ClinicOS pane); log `req020-tablet: created=true` |
| AC4 — no "Errore temporaneo…", no console errors / unexpected 4xx-5xx | PASS | log `created=true consoleErrors=0` (both viewports); no "Errore temporaneo" in log |
| AC5 — mock runtime receives ≥1 document-job call | PASS | log `POST /v1/document-jobs 201 Created` + `OK: mock runtime received a document-job request` |
| AC6 — other gates stay green | PASS | run 29505031086: secret-scan, gate, real-provider all `success`; `gate` runs `scripts/ci/ai-import-e2e-config.test.mjs` (config guard untouched) |
| AC7 — full run green on the PR SHA | PASS | run 29505031086 `conclusion=success` on SHA `83f6afd`; all 4 jobs success |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit (workflow-config guard) | PASS | `test-results/config-test-GREEN.txt`; run `gate` step "Browser-e2e CI-path config guard (#267)" success |
| Integration | NA | |
| API (gate import E2E) | PASS | `gate` job success (import-e2e / new-vs-existing / async / therapy-import) |
| Playwright (browser-e2e desktop+tablet) | PASS | `screenshots/req020-*-6-created.png`; log `created=true` ×2 |
| Persistence after refresh | PASS | after create the modal closes and the new patient appears in the refetched list (`req020-*-6-created.png` shows the patient row + MRN) |
| Agnos AI | NA | |
| Voice | NA | |
| OCR/import | PASS | exercised end-to-end by the browser-e2e job against the mock runtime (document-job calls in log) |
| Security/privacy | PASS | `secret-scan` job success; evidence logs sanitized (no secrets); synthetic fixtures only |

## Runtime Evidence
- `screenshots/req020-desktop-2-review.png` — desktop Revisione with `srev-PATIENT_DEMOGRAPHICS`.
- `screenshots/req020-desktop-4-clinica.png` — intake step 3 (Clinica), therapy acceptance.
- `screenshots/req020-desktop-5-verifica.png` — intake step 6 (Verifica), anagrafica acceptance.
- `screenshots/req020-desktop-6-created.png` — patient "Sintetico_desktop, E2E" created (MRN-1784211125699-upsi), 1 paziente totale.
- `screenshots/req020-tablet-2-review.png` — tablet Revisione (Dati ClinicOS pane).
- `screenshots/req020-tablet-6-created.png` — patients list with "Sintetico_tablet, E2E" (MRN-1784211146729-es4b), 2 pazienti totali.

## Logs
- `test-results/browser-e2e-job.sanitized.txt` — sanitized excerpt (install, `created=true` ×2, document-job asserts, exit codes).
- `logs/run-29437486520-*.log` — earlier-failure excerpts (context for the prior causes).
Only sanitized logs are committed.

## Residual Risks
- The happy path now traverses the full intake wizard; it stays deterministic because the stack is hermetic
  (local backend + mock AI runtime), the same wiring the green `gate` API E2E already exercises.
- Removing `continue-on-error` (prior commit) keeps any future regression visible instead of masked.

## Final Decision

READY FOR CODEX QA
