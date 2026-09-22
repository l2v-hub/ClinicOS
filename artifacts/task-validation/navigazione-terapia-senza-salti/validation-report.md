# Validation report — Navigazione terapia senza salti

## Result
The therapy tab navigation now precedes conditional anomaly notices, filters and errors within the existing ClinicalTableSection. Its position no longer depends on the selected view or on whether the prescription form is open. Existing controls, warning conditions and data logic are unchanged.

## Evidence
- Baseline ec3b8fbeb6319f8b81f7ff9f53c2be711b0e582e reproduced a 180px vertical tab shift between Programmazione and Calendario (synthetic case with filters and anomaly notice).
- Candidate: 0px shift between all six tabs at 1294×1032 and 390×844. The navigation offset within the section remains 61px.
- 19 browser assertions passed: tab geometry, no page overflow, controls following navigation, filter persistence, desktop/mobile form opening, calendar failure/retry, empty state, fixture errors. Evidence: browser-evidence.json.
- All four synthetic screenshots were visually reviewed. Tabs remain horizontally scrollable on mobile. Existing mobile section-title truncation is unchanged.
- `npm --prefix frontend run build`: PASS (TypeScript project build and Vite production bundle, 413 modules, 9.28s Vite build). Existing shared-chunk size warning remains non-blocking.
- Scoped `git diff --check`: PASS. Exactly one application file changed. No API, backend, environment, dependencies, schema or clinical-data changes.

Browser clicks on the bottom actions of a long form can scroll the document; the form test therefore verifies the invariant offset within the section. No trace/video export is available through supported CUA. No live clinical writes are used for validation. This is root-executed verification, not a separate independent QA run.

## Release decision
ALLOW commit and push of the reviewed component plus this task's selected evidence, then deploy the exact committed frontend inputs to the existing Vercel project clinicos__ (prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6), alias clinicos-eosin.vercel.app. Authority: current correction request and prior explicit user authorization to push/publish completed modifications. Preserve unrelated launcher edits and prior artifacts. No backend deployment or settings edits.

## Final Decision
Final Decision: CLOSED — VERIFIED

Local acceptance criteria passed. Deployment receipt and read-only live smoke follow publication and bind the exact release commit.
