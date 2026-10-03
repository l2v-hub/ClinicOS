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

IMPLEMENTED — LOCAL UI VERIFIED; INDEPENDENT FRONTEND QA AND ONLINE VERIFICATION PENDING.
Shared Ho capito persistence online remains dependent on the backend release.
