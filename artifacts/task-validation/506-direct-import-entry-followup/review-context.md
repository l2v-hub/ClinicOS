# Read-only review context: #506 follow-up

Issue506 asks that the real Importa dimissione and Riprendi bozza controls open within the existing main pane without covering topbar/sidebar. Mainline merge59 of PR508 fixed NewPatientFlow but missed PatientList's separate AIImportStatus entry. Actual authenticated demo verification exposed it; old evidence and release hold remain intact.

## Frozen implementation scope

Two production paths: `frontend/src/components/shared/AIImportStatus.tsx` and `frontend/src/components/operator/PatientList.tsx` (explicit page prop at the actual entry). Four new regression files: `frontend/src/components/shared/__tests__/aiImportPresentation506.test.ts`, `frontend/e2e/issue506-direct-entry.html`, `frontend/e2e/issue506-direct-entry.tsx`, `e2e/issue506-direct-entry.mjs`. No other production delta from59. Original `e2e/issue506-workspace.mjs` remains byte-identical.

Relevant unchanged seams: AccessibleDialogSurface, PatientWorkspaceSurface, DialogLoading, DischargeImportModal, NewPatientFlow and intake/IntakeWorkspace. The new runner actually mounts PatientList (not only NewPatientFlow), delays its real lazy module and uses real import/review/intake/resume controls. Synthetic API state persists across browser reload within a run; this is a UI contract test, not backend persistence certification. No confirmation endpoint is allowed. Fixture capabilities/actor exist only in the unbundled E2E entry, not production authentication.

## Evidence and history

Read `validation-report.md`, `evidence/independent-qa2/public/validation-report.md`, `qa-summary.json`, browser result JSONs and manifests. Fresh independent QA2 verified exact source9b420754 and all six blobs. The final PR head adds audited evidence only; exact-head CI is separately required before invoking review.

QA1 failed a fixture close action after the mobile drawer transition. Source revision2 uses the same scrim class/click behavior as App and waits for settled open/closed states; it does not force a click or drop assertions. The final fixture reproduces the actual missing-workspace bug on original production59 before any job creation. A secondary Windows libuv abort after that expected failure is disclosed, not hidden. Existing legacy tests independently pass at four widths.

Original four genuine Claude reviews, their reports, implementation attempts and old release proof are immutable. The human explicitly authorized one additional review. Native maintainer allowance was extended4→5; this separate post-merge follow-up consumes global round5 exactly once, without budget reset or API fallback. Review uses the verified stored Claude Max login and restricted Read/Glob/Grep only. A cron result empty is not a review.

Review code and regression risks; do not infer correctness from prior approval or QA. Tests were executed by independent Codex QA, not Claude. Post-merge online verification is a mandatory subsequent release/closure gate; no online resolution is claimed by the pre-release local report. Return blocked if essential review evidence is missing; retain every actionable finding. Claude may not edit, execute commands, invoke services, merge/deploy/close or spawn agents. Codex implements and is final gatekeeper.
