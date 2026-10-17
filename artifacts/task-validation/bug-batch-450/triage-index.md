# Issue grouping

Group: bug-batch-450
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6

[
  {
    "issue": 450,
    "files": [
      "frontend/src/components/operator/NewPatientStart.tsx",
      "frontend/src/components/operator/NewPatientStart.css",
      "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
      "frontend/src/components/shared/intake/StepAnagrafica.tsx",
      "frontend/src/components/shared/intake/intakeProgress.ts",
      "frontend/src/components/shared/InlineEditableField.tsx",
      "frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts",
      "scripts/e2e/issue-450-ingresso.mjs",
      "frontend/src/components/shared/intake/__tests__/intakeProgress.test.ts"
    ]
  },
  {
    "issue": 472,
    "files": [
      "frontend/src/components/shared/DischargeImportModal.tsx",
      "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
      "frontend/src/components/shared/import/ImportSession.css",
      "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
      "frontend/src/components/shared/intake/IntakePage.css",
      "frontend/src/components/shared/intake/intakeDraftApi.ts",
      "frontend/src/components/operator/PatientList.tsx",
      "frontend/src/lib/patientListView.ts",
      "backend/src/intake/draft-service.ts",
      "backend/src/routes/intake-drafts.ts",
      "backend/src/patients/progressive-identity.ts",
      "frontend/src/components/shared/intake/__tests__/intakeDraftSession.test.ts",
      "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
      "scripts/e2e/issue-450-ingresso.mjs",
      "frontend/src/components/operator/NewPatientFlow.tsx",
      "frontend/src/components/shared/intake/intakeDraftSession.ts"
    ]
  },
  {
    "issue": 473,
    "files": [
      "frontend/src/components/shared/DischargeImportModal.tsx",
      "frontend/src/components/shared/import/ImportReviewWorkspace.tsx",
      "frontend/src/components/shared/import/ImportSession.css",
      "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
      "frontend/src/components/shared/intake/IntakePage.css",
      "frontend/src/components/shared/ImportReviewFull.tsx",
      "frontend/src/components/shared/intake/StepAnagrafica.tsx",
      "frontend/src/lib/codiceFiscale.ts",
      "backend/src/lib/codice-fiscale.ts",
      "backend/src/intake/parse-discharge-therapy.ts",
      "backend/src/intake/draft-service.ts",
      "backend/src/ai/sections/patient-narrative.ts",
      "backend/src/ai/upload/confirm-service.ts",
      "backend/src/intake/__tests__/seed-draft-from-import.test.ts",
      "backend/src/intake/__tests__/parse-discharge-therapy.test.ts",
      "scripts/e2e/issue-450-ingresso.mjs",
      "frontend/src/components/shared/sections/ImportSectionsReview.tsx"
    ]
  },
  {
    "issue": 475,
    "files": [
      "frontend/src/components/shared/import/ImportPageView.tsx",
      "frontend/src/components/shared/import/importSourceCache.ts",
      "frontend/src/components/shared/PdfCanvasPreview.tsx",
      "frontend/src/components/shared/PdfCanvasPreview.css",
      "frontend/src/lib/pdfPreviewResources.ts",
      "frontend/config/pdfPreviewAssets.ts",
      "backend/src/routes/import-pages.ts",
      "frontend/src/components/shared/import/__tests__/importReview.test.ts",
      "scripts/e2e/issue-450-ingresso.mjs"
    ]
  },
  {
    "issue": 476,
    "files": [
      "frontend/src/lib/intakeDemographics.ts",
      "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
      "frontend/src/components/shared/intake/StepVerifica.tsx",
      "frontend/src/components/shared/intake/StepAnagrafica.tsx",
      "frontend/src/components/shared/intake/intakeProgress.ts",
      "backend/src/patients/progressive-identity.ts",
      "backend/src/ai/upload/confirm-service.ts",
      "frontend/src/lib/__tests__/intakeDemographics.test.ts",
      "backend/src/intake/__tests__/confirm-draft-guards.test.ts",
      "scripts/e2e/issue-450-ingresso.mjs",
      "frontend/src/components/shared/sections/ImportSectionsReview.tsx",
      "frontend/src/components/shared/intake/IntakeIndex.tsx",
      "frontend/src/components/shared/intake/__tests__/intakeProgress.test.ts"
    ]
  }
]

Integration order: Manual and import intake are consolidated to avoid IntakeWorkspace overlap. PatientList and patientListView overlap future452 list presentation: land this batch first, then rebase452 and rerun both draft/status and identity/list regressions; do not modify unrelated row presentation. Therapygroup owns therapy administration/AIFA, which are outside this intake scope.

Acceptance, commands and distinct issue evidence are frozen in implementation-plan.md.
