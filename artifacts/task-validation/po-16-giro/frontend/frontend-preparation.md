# PO16 frontend preparation

Prepared from baseline 53e57d694850775b85ad1d22904e7bb1e6e84618 in C:/Workspace/ClinicOSHouse-worktrees/po16-final-ui on codex/po16-final-ui. No application source or tests changed and no application test/build suite executed. Application work awaits explicit root GO after PO15 is published and verified.

## Observed source and proposed bounded changes

- MnaForm.tsx option labels always append punti. MnaAnthropometry.tsx does the same for category options and derived results. MnaSummary.tsx appends punti to non-null item scores. After GO, show punto only for the exact numeric score 1 and retain Italian numeric formatting for all scores, including 0 and 0,5.
- AssessmentHistory.tsx interpolates the MNA total/screening score directly. After GO, apply it-IT display formatting in the MNA branch so 27.5 appears as 27,5. Preserve incomplete/full/screening/correction metadata and all other module branches.
- MnaAnthropometry and MnaSummary already use displayMnaBmi from mnaLocalInputs.ts. It rounds to two displayed decimals only when the MNA band remains unchanged, preserving raw representation near 19/21/23 and near zero. Keep that helper and all score/validation/snapshot definitions unchanged. MnaOutcomes already formats decimal total/global scores with it-IT.
- AssessmentCatalog.css already wraps rows below 900px and stacks actions below 480px, but defines no 44px touch minimum. Root measured current controls at 34px. After GO, add a scoped max-width:768px rule giving catalog buttons and the existing Tutti i moduli return button a minimum 44px target; permit wrapping within available width and retain desktop compactness.
- The return action is a button with class patient-module-return, outside the catalog section. CSS can target that existing class without editing PatientDetail.
- Backend/PDF renderer presentation is outside this worker's scope. Root/backend must apply any PDF singular/IMC display correction while preserving archived PDF bytes. No FE scoring, answers, snapshot schema, version or archived documents will be changed.

Proposed application paths after GO: frontend/src/components/operator/assessments/MnaForm.tsx, MnaAnthropometry.tsx, MnaSummary.tsx, AssessmentHistory.tsx, AssessmentCatalog.css; focused assertions in frontend/src/components/operator/__tests__/mnaUi.test.ts as needed. Exact application claim is acquired only after GO. No new formatter abstraction or duplicated scoring is required.

## Verification after GO

Reuse the existing MNA fixtures, production renderers and tests. Verify singular 1 punto in generic/category/derived/summary paths, plural zero/fractional/other scores, Italian 27,5 history, stable screening/partial labels and unchanged input answers/snapshots. Existing MNA definition/workflow tests cover scoring and boundary-sensitive BMI display; rerun them with relevant assessment/catalog regressions and production build. Compare lint against this baseline and bind final sources/bundle scans to evidence.

Root owns synthetic browser checks at widths 390/768/1262: catalog controls at least 44px on mobile/tablet, no horizontal overflow, keyboard focus and retained desktop density. CSS/source inspection does not establish actual touch geometry or physical-device usability. Root also owns integrated PO16 clinical workflow, HTTP/PostgreSQL, PDF and publication checks.

## Ownership and runtime

Ruflo guidance and recall were read; memory search found no matching pattern. Existing source and root contracts are authoritative. The tracked agent-team README describes a GitHub/Claude issue supervisor; this preparation task is the direct Codex hierarchy assignment and does not start that external supervisor or post GitHub messages. The local preparation-session.json plus Ruflo exact-directory claim record this worker's identity, authority and source state.

Shared installed dependencies are linked read-only by policy from C:/Workspace/ClinicOSHouse-worktrees/quality-loop-20260829/node_modules. TS/Vite caches are local. Protected run-claude-queue.ps1 and start-claude-team.ps1 were already dirty immediately after worktree creation; their bytes and AssessmentWorkspace.css remain unchanged. No dependency install, backend/package/lockfile edit, worker server/port, commit, push, deployment or live data write is authorized here.
