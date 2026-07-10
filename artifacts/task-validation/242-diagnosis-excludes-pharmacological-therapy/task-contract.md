# Task Contract — Issue #242 (Diagnosi di dimissione non deve includere la terapia farmacologica)

## Issue + PR refs
- GitHub Issue: **#242** — "Diagnosi di dimissione non deve includere la terapia farmacologica".
- PR/branch: `fix/issue-242-diagnosi-terapia` (worktree `E:/Workspace/DG_SE_DEV/ClinicOS/.wt-fix/242`).
- Prior commits on this branch:
  - `b5a0a66` — `fix(issue-242): keep pharmacological therapy out of discharge diagnosis` (backend parser fix).
  - `82d9641` — `test(issue-242): evidenza controllata input→output parser diagnosi/terapia + validation-report` (parser-only evidence — **Codex QA FAILED**: "The issue explicitly requires the real patient UI flow: set diagnosis and therapy, save, reload, and verify separation. AC3 and the required Playwright workflow are not proven.").
  - This remediation pass (current): adds the missing UI-flow Playwright evidence + this task-contract.md. **No application code changed** — Codex already stated "Code review PASS — parser change is scoped and tested" for the parser fix itself.

## Current Behaviour (concrete)
- **Pre-fix** (before `b5a0a66`): the discharge-letter markdown parser (`backend/src/ai/sections/markdown-parse.ts`) did not recognize an inline `Terapia:`/`TD:` label when it appeared inside a combined heading such as "Diagnosi e terapia alla dimissione". As a result, drug names (e.g. Ramipril, Bisoprololo, Furosemide) ended up concatenated into `diagnosisText` instead of being split into `therapyText`, so the imported diagnosis text visually included pharmacological therapy content.
- **Post-fix, pre-this-remediation**: the parser fix was unit-tested (`markdown-parse.test.ts`, 20/20 incl. 2 new tests for #242) and proven via a synthetic input→output QA surface (parser fed a combined-heading letter, output rendered to `report.html` + screenshot + trace). This is a legitimate proof of the **import/OCR path** (AC4), but it does **not** exercise the real patient chart: nobody had opened a patient, manually added a diagnosis via `DiagnosisEditor`, manually added a therapy via `TerapiaFarmacologicaTab`, saved both, reloaded the page, and confirmed the two stayed in their own sections. That is the gap Codex flagged.

## Expected Behaviour (concrete)
- On the patient chart, diagnosis and pharmacological therapy are always managed and displayed **only** in their own respective sections:
  - Diagnosi: `Clinica` (L2) → `Diagnosi` (L3) tab, rendered by `PatientDetail.renderDiagnosi()` via `DiagnosisEditor` (`frontend/src/components/operator/sections/DiagnosisEditor.tsx`). Persisted through `onChange={list => upd({ diagnosi: list })}` → `PUT /patients/:id/cartella`.
  - Terapia Farmacologica: `Clinica` (L2) → `Terapia Farmacologica` (L3) tab, rendered by `TerapiaFarmacologicaTab` (`frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`). Persisted through `POST /patients/:id/therapies` (201 on success).
- Adding a diagnosis never creates or shows a therapy row, and vice versa.
- The separation is **stable across a full page reload** — i.e. it is a property of the persisted data model, not just of in-memory component state.
- The import/OCR mapping (AC4) continues to route diagnosis text to `diagnosisText` and therapy text to `therapyText` (already proven by the parser fix + unit tests; unchanged by this remediation).

## Acceptance Criteria (from the issue, verbatim) + how asserted

| # | Acceptance criterion (verbatim intent from issue #242) | How asserted in this remediation |
|---|---|---|
| AC1 | Diagnosi management shows only diagnosis entries (no therapy/drug data). | `e2e/remediation/issue-242.spec.ts`: after saving the synthetic diagnosis, `.cr-diag-desc` shows exactly `Scompenso cardiaco cronico (sintetico 242)`; the Diagnosi tab (`.cr-tab-content`) is asserted to contain **0** occurrences of the drug name `Ramipril242`, both immediately and after `page.reload()`. |
| AC2 | Pharmacological therapy must never appear inside the diagnosis. | Same spec: `drugTextOnDiagnosisSurface` / `drugAfterReloadOnDiagnosis` assertions (`expect(...).toBe(0)`) on the Diagnosi surface, pre- and post-reload. |
| AC3 | Diagnosi and Terapia remain in separate sections, and this holds after save + reload. | Same spec, step 4: `page.reload()` then re-open both tabs and re-run both positive (own data still visible) and negative (other surface's data still absent) assertions. This is the exact gap Codex called out as unproven — now covered end-to-end via real UI navigation (role gate → Pazienti → Moretti, Elena → Clinica → Diagnosi / Terapia Farmacologica), not a parser-only surface. |
| AC4 | Import mapping: diagnosis text → diagnosis field, therapy text → therapy field. | Covered by the existing `backend/src/ai/__tests__/markdown-parse.test.ts` (20/20 PASS, incl. 2 tests added for #242) and the prior parser I/O evidence (`report.html`, `screenshots/diagnosi-terapia-separate.png`, `trace/trace.zip`, `logs/parse-input-output.log`) already in this evidence directory — unchanged, still valid, this is the import path proof, distinct from AC1–AC3's manual-editor path. |

## Impact table

| Area | Impact | Note |
|---|---|---|
| Frontend | No | No component code changed. Only a new Playwright spec (`e2e/remediation/issue-242.spec.ts`) + config (`e2e/remediation/pw.config.242.ts`) added, driving existing `DiagnosisEditor` / `TerapiaFarmacologicaTab` UI. |
| Backend | No | Parser fix (`b5a0a66`) already reviewed PASS by Codex; no further backend change in this remediation pass. |
| DB | No | No schema/migration change. Test writes synthetic rows through the normal API (`PUT /cartella`, `POST /therapies`); best-effort cleanup in `afterAll`. |
| API | No | No route/contract change. Spec only calls existing `PUT /patients/:id/cartella` and `POST /patients/:id/therapies`. |
| Privacy | No | Synthetic-only patient data on a pre-existing seed patient (Moretti, Elena); no PHI introduced; diagnosis/drug strings are clearly tagged `(sintetico 242)` / `242` suffix so they are identifiable as test artifacts and safe to leave if cleanup fails. |

## Test Plan

| Test | REASON |
|---|---|
| `e2e/remediation/issue-242.spec.ts` (Playwright, real UI, single worker) | Codex explicitly demanded the real patient UI flow — set diagnosis, set therapy, save, reload, verify separation — as the missing objective evidence for AC1–AC3. This is a net-new spec covering that flow end-to-end against a live local stack. |
| `backend/src/ai/__tests__/markdown-parse.test.ts` (node:test, existing, 20/20) | Covers AC4 (import/OCR mapping path), already reviewed and accepted by Codex ("parser change is scoped and tested"); re-cited here, not re-authored, to keep AC4 evidence linked in this contract. |
| `npx playwright test --config e2e/remediation/pw.config.242.ts --list` | Gate required by the remediation contract to prove the new spec parses before handoff; run and passed (1 test listed) — see validation report. |

## Risks (concrete)
- The spec depends on a pre-existing seed patient "Moretti, Elena" being present in whichever environment the controller runs it against; if renamed/removed the `openPatient()` helper will fail at the `getByText('Moretti, Elena')` step (fails loudly, not silently).
- `TerapiaFarmacologicaTab` shows either a `+ Aggiungi farmaco` button (when at least one active therapy already exists) or a `+ Aggiungi` link inside the empty-state message (when the patient has zero active therapies); the spec handles both by trying the primary button first and falling back to the link, but if Moretti, Elena's fixture data changes shape this branch should be re-verified.
- Cleanup in `afterAll` is best-effort (per remediation brief, "if not, leave synthetic data — acceptable"): if the `Elimina` icon buttons aren't found (e.g. UI change), synthetic rows `Scompenso cardiaco cronico (sintetico 242)` / `Ramipril242` remain in the target DB; they are clearly tagged as synthetic and non-PHI.
- Test was authored but **not executed** in this pass (per remediation contract: authored now, executed later by the controller against the shared local stack) — `--list` parse-check is the only gate run here.

## QA surface chosen
Real running frontend (`http://localhost:5173`) driven end-to-end through the actual patient-chart UI (no mock/stub surface needed — this is a standard CRUD UI flow, not an internal/headless feature).
