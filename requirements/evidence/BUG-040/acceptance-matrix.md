# BUG-040 — Acceptance matrix

Issue: #62 — *Diagnosi narrativa esplosa in 36 record strutturati*

## Triage result: ALREADY RESOLVED IN CODE (verify-on-deploy)

The import is narrative-only; a multi-line diagnosis stays ONE text block. No splitting logic exists. Verified by regression test (10 canonical sections, not N rows).

The discharge import was refactored to be **purely narrative** (REQ-028/030/033): the AI
extraction produces only text fields (`diagnosisText`, …) — never a structured `diagnoses[]`
array, type/status, or ICD code. The confirm path persists the operator's narrative payload
verbatim; structured `cartella.diagnosi[]` is only ever filled **manually** by an operator in
PatientDetail, never by the import. A runtime contract assertion (BUG-050) blocks any legacy
array regression and is now observable in production.

| Acceptance criterion | Status | Evidence |
|----------------------|--------|----------|
| No structured rows generated from narrative diagnosis | **PASS** | `patient-narrative.test.ts` "BUG-040/041/042: multi-line diagnosis -> ONE narrative block, no structured fields" |
| No inferred type/status/ICD | **PASS** | same test (asserts row has no type/stato/status/icd keys) |
| No `diagnoses[]`/`medications[]` in the new flow | **PASS** | `import-contract.test.ts` + `assertNoLegacyImportArrays` (runs in prod) |
| E2E on deployment preview/production | **BLOCKED** | GitHub Actions billing-blocked — verify after redeploy |

## Notes
- The issue's production evidence is consistent with a **stale prod build**; a successful redeploy is
  expected to remove the visible symptom. No code change required beyond the regression lock + the
  BUG-050 production assertion already committed.
- Build: backend `npm run build` PASS; backend tests for this area 8/8 PASS.
