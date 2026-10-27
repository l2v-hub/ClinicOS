# Group remains only issue507

{
  "feature": "patient-therapy/admission-date-defaults",
  "fileMap": [
    {
      "issue": 507,
      "files": [
        "e2e/issue507-smoke.mjs",
        "e2e/issue507/entry.tsx",
        "frontend/src/components/operator/PatientDetail.tsx",
        "frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx",
        "frontend/src/components/operator/cartella/TherapyFormFields.tsx",
        "frontend/src/components/operator/cartella/__tests__/therapyAdmissionDefaults.test.ts",
        "frontend/src/components/operator/sections/TherapyEditor.tsx",
        "frontend/src/components/operator/sections/TherapyIntakeEditor.tsx",
        "frontend/src/components/shared/intake/StepClinica.tsx",
        "frontend/src/lib/therapyAdmissionDate.ts"
      ]
    }
  ],
  "separationReason": "Independent root causes and no shared changed source files: #506 page surfaces/navigation versus #507 therapy date provenance. Separate worktrees and per-issue PRs avoid coupling.",
  "previousPlanSha256": "6245049642d3c1d884cf1e4ee7a3680bce4e53285d7e8dce625c1f96c6fd8b24",
  "newPlanSha256": "6c43266e4b3f69ba62deda07703d069ca583cba1d838d12bb47e7ee4360179eb",
  "scopeUnchanged": true
}
