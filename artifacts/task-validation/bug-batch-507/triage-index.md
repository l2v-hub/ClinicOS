# Issue grouping

Issue #507; feature patient-therapy/admission-date-defaults; baseline 715a4b9e47ff9bd0192b7f58f24271e48da4900d.

Separate newly authorized issue; different root cause and nonoverlapping source files from the other new issue, preserving independent acceptance/evidence and ongoing automation reviews.

[
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
]

Independent root causes and no shared changed source files: #506 page surfaces/navigation versus #507 therapy date provenance. Separate worktrees and per-issue PRs avoid coupling.

Frozen cohort remains unchanged; issue516 is separate.
