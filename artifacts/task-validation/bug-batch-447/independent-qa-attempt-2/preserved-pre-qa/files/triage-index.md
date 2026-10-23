# Issue grouping

Group: bug-batch-447
Baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6

[
  {
    "issue": 447,
    "files": [
      "frontend/src/components/operator/PatientDetail.tsx",
      "frontend/src/components/operator/PatientRecordData.css",
      "frontend/src/components/operator/PatientOverview.css",
      "frontend/src/components/operator/PatientToday.tsx",
      "frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx",
      "frontend/src/components/shared/TherapyCalendarGrid.tsx",
      "frontend/src/components/operator/cartella/AvvisoAnomalieFarmaci.tsx",
      "frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx",
      "frontend/src/components/operator/tabGroups.ts",
      "frontend/src/components/shared/DemographicsStatus.tsx",
      "frontend/src/components/operator/cartella/__tests__/uxW4Misc.test.ts",
      "frontend/src/components/operator/__tests__/patientToday447.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  },
  {
    "issue": 451,
    "files": [
      "frontend/src/components/operator/MultiPatientParametri.tsx",
      "frontend/src/components/operator/ParameterEntryPanel.tsx",
      "frontend/src/components/operator/ParameterPatientPick.tsx",
      "frontend/src/components/operator/ParameterReadingForm.tsx",
      "frontend/src/components/operator/ParameterReadingForm.css",
      "frontend/src/components/operator/PatientParameters.css",
      "frontend/src/lib/parameterPad.ts",
      "frontend/src/lib/parameterRound.ts",
      "frontend/src/lib/__tests__/parameterRound451.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  },
  {
    "issue": 452,
    "files": [
      "frontend/src/components/operator/PatientList.tsx",
      "frontend/src/components/operator/PatientRoster.tsx",
      "frontend/src/components/operator/PatientList.css",
      "frontend/src/components/operator/PatientRegimeControls.tsx",
      "frontend/src/components/shared/PatientIdentity.tsx",
      "frontend/src/components/operator/TherapyGiroRows.tsx",
      "frontend/src/components/operator/ConsegnePatientRoster.tsx",
      "frontend/src/components/operator/PatientDetail.tsx",
      "frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx",
      "frontend/src/components/operator/OperatorAgenda.tsx",
      "frontend/src/components/operator/__tests__/operationalLists452.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  },
  {
    "issue": 453,
    "files": [
      "frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx",
      "frontend/src/components/operator/cartella/TherapyFormFields.tsx",
      "frontend/src/components/operator/cartella/TherapyFormFields.css",
      "frontend/src/components/operator/cartella/TherapyFormPreview.tsx",
      "frontend/src/components/operator/cartella/therapyQuickSchedule.ts",
      "frontend/src/components/operator/cartella/drugPackageSelection.ts",
      "frontend/src/components/operator/cartella/__tests__/therapyQuickSchedule453.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  },
  {
    "issue": 454,
    "files": [
      "frontend/src/components/operator/TherapyRoundsPage.tsx",
      "frontend/src/components/operator/TherapyRoundsPage.css",
      "frontend/src/components/operator/TherapyPatientAllergies.tsx",
      "frontend/src/components/operator/cartella/PatientTherapyCalendar.tsx",
      "frontend/src/components/shared/TherapyCalendarGrid.tsx",
      "frontend/src/lib/therapyGiro.ts",
      "frontend/src/lib/__tests__/therapyEntry454.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  },
  {
    "issue": 456,
    "files": [
      "frontend/src/components/admin/AdminDashboard.tsx",
      "frontend/src/components/admin/AdminAttentionList.tsx",
      "frontend/src/components/admin/adminAttentionModel.ts",
      "frontend/src/components/admin/AdminAttentionList.css",
      "frontend/src/components/admin/__tests__/adminAttention456.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  },
  {
    "issue": 457,
    "files": [
      "frontend/src/components/operator/PatientDetail.tsx",
      "frontend/src/components/operator/InvioPSModal.tsx",
      "frontend/src/components/operator/invioPSModel.ts",
      "frontend/src/lib/emergencyTransferContext.ts",
      "frontend/src/components/operator/__tests__/invioPS.test.ts",
      "frontend/src/lib/__tests__/invioPSPrintLayout.test.ts",
      "e2e/qa-bug-batch-447.mjs",
      "e2e/qa-bug-batch-447-browser.mjs"
    ]
  }
]

Integration order: Batch432 owns authoritative therapy write/query/schema, AIFA catalog semantics and App.tsx; this batch owns clinical presentation and reuses its public read/write contracts without editing backend or App.tsx. Integrate tested432 before final therapy/UI QA. Batch450 owns intake/import draft lifecycle and changes PatientList.tsx; this batch changes existing row presentation only. Integrate450 first, reconcile PatientList without overriding draft visibility/status, rerun both draft and operational-list regressions. Shared identity component gains an opt-in compact presentation preserving default callers and accessible disambiguation. No parallel edit to another worktree or silent frozen scope expansion.

Acceptance, commands and distinct issue evidence are frozen in implementation-plan.md.
