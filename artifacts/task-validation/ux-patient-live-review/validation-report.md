# Task Validation Report

- Task: ux-patient-live-review
- Date: 2026-10-04
- Source base: a3ab80f796ec390c09435fddf2c77c2cfb0b7443
- Scope: frontend compatibility and acknowledgement copy; synthetic QA only.

## Findings and implementation

The provided screenshots used the previous frontend bundle. Reloading the newly deployed
client revealed a separate production defect: the older server returns openPreview and
urgentOpen, while App assumed recentPreview and acknowledgement-aware urgentActive.
The unchecked cast crashed the dashboard. This invalidates the previous release's claim
of compatibility with the actual online API; the earlier browser fixture only tested the
new schema.

The overview now passes runtime validation. Incompatible responses produce the existing
retryable unavailable state and unknown counter, never a crash, zero or a fabricated
shared acknowledgement. ACK success requires an actual reader and valid timestamp.

Shared history says Letta e compresa, shows reader/role/time and retains the original
urgent priority. Older personal reading records remain visible as Letta da ...,
registrazione personale; completion without reader evidence is not interpreted as reading.
No COMPLETATA badge is rendered. Ho capito explains the active-alert effect.

## Acceptance evidence

| Criterion | Local result | Evidence |
|---|---|---|
| AC1 current/legacy/malformed overview | PASS | test-results/focused.txt; test-results/runtime.json |
| AC2 compact vitals and allergy spacing | PASS | actual PatientDetail at 768/1074/1395px: six tiles 102px high; gap 24px; screenshots/actual-patient-1074.png |
| AC3 explicit reading history | PASS | screenshots/actual-diary-1074.png; shared reader and historical original priority; older personal read distinguished; no invented acknowledgement |

Unit/regression tests: 65/65 pass. Frontend build and final independent review results are
recorded alongside the immutable candidate before publication. Browser assertions include
failed/successful ACK, author restriction, reload persistence in the synthetic server,
modal focus/Escape, four responsive widths, actual App legacy contract, actual patient shell,
no page overflow, and no unexpected console errors. Runtime fixtures intercept every API
request; no real clinical record was created or acknowledged.

Artifacts: test-results/build.txt, test-results/focused.txt, test-results/runtime.json,
screenshots/, trace/ux-turno.zip, video/ux-turno.webm. Early fixture failures (outdated text
expectation, incomplete directory mock, Windows watcher locked on recorded video) were
resolved; run-preview.mjs excludes artifacts from the QA watcher.

## Security and publication boundary

No backend, Prisma, API URL, auth, package or lockfile change. No raw HTML injection,
credentials or real patient records in committed fixtures/evidence. Live browser reads
and navigation are for the user's existing demo context, without clinical writes.

The user has authorized pushing to l2v-hub/ClinicOS and making the frontend visible online.
Backend/schema publication is a separately pending explicit question, required by CLAUDE.md.
See backend-release-plan.md for the concrete dependency and unverified release risks.

## Final decision

VERIFIED AND PUBLISHED — FRONTEND ONLY. Shared persistence online remains pending.

Independent verdict READY FOR CODEX QA for f4a31fe02d96158bdcc6a7cdcd83c12629d79b73;
65/65 tests, build and browser pass. 771 candidate input hashes match before/after,
aggregate 09536f45905d68004d9269311b0b972164ba164a3606bc28329611dcf38ed86a.
See independent-qa/validation-report.md and independent-qa/playwright-report/index.html.
Shared Ho capito persistence online remains dependent on the backend release.

## Online verification

Vercel production dpl_CDB8UgFUeAYoMD4FL1wDJNL92kvg is READY and aliased to
https://clinicos-eosin.vercel.app. Build: 661 modules, TypeScript/Vite success.
The existing browser was reloaded and visibly loaded /assets/index-CiijlMnZ.js.
Turno renders without the previous module failure; the incompatible legacy overview is
shown as unavailable with an unknown counter rather than a fabricated value.

Using the original nurse simulator profile, the user's annotated cartella was opened
through the visible patient list. At the actual 1074px viewport: six tiles are 102px high,
allergy-to-content gap is 24px, zero COMPLETATA badges, zero module-error elements.
The expansion dialog opens and closes successfully. No new console errors after reload.
No clinical values or acknowledgements were written. Live patient screenshots/data were
not copied into GitHub evidence; the committed screenshots use synthetic QA fixtures.

An active-page same-document hash navigation did not switch the visible section; the
check used the application's patient-list button instead. This is not represented as a
verified direct-hash navigation fix. The earlier doctor simulator did not list the nurse's
annotated patient, reflecting the older server scope; the original nurse profile was restored.
