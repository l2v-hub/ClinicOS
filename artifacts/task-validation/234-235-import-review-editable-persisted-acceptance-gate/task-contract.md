# Task Contract

## Task
- Title: 234-235 import review editable persisted acceptance gate
- Slug: 234-235-import-review-editable-persisted-acceptance-gate
- Type: change
- Date: 2026-07-07

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

- IntakeWorkspace autosave (updateSection → patchDraft) swallows errors silently; no save-status feedback.
- DischargeImportModal.handleProceedToWorkspace forwards only the reviewed anagrafica (patient); the reviewed cartella/documentSections text is dropped when handing off to the workspace.
- The "Crea paziente"/Conferma button only gates on firstName+lastName+dateOfBirth; there is no explicit acceptance of demographics or therapy.

## Expected Behaviour

- Autosave shows an unobtrusive, aria-live status: Salvataggio… / Salvato / Errore salvataggio — riprova. Errors are logged (sanitized) not swallowed.
- Reviewed section text (documentSections) is persisted into the draft before handoff (best-effort, never blocks).
- Create is blocked until the operator explicitly accepts demographics AND therapy; StepVerifica shows a residual-blocks checklist. Acceptance persists in draft.data._accepted.

## Acceptance Criteria

- AC1: Proposed/import text is editable, persists across navigation and on confirm; save state visible + accessible.
- AC2: Reviewed documentSections reach the draft on handoff (survive reload); save error surfaced not swallowed.
- AC3: Create button disabled until _accepted.demographics && _accepted.therapy; checklist lists what is missing; acceptance survives reload.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | frontend-only surgical UI state |
| Integration | no | |
| API | no | uses existing patchDraft/confirmDraft |
| Playwright | no | manual/QA verification |
| Persistence after refresh | yes | _accepted + documentSections must survive reload |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
