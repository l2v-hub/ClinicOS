# Issue grouping

Batch: bug-batch-507
Baseline: 715a4b9e47ff9bd0192b7f58f24271e48da4900d
Feature: patient-therapy/admission-date-defaults

Separate newly authorized issue; different root cause and nonoverlapping source files from the other new issue, preserving independent acceptance/evidence and ongoing automation reviews.

## Issue to affected files

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

## Separation from overlapping groups

Independent root causes and no shared changed source files: #506 page surfaces/navigation versus #507 therapy date provenance. Separate worktrees and per-issue PRs avoid coupling.

This is a new explicit source/evidence packet. Original unpublished C5 packet bytes were not recovered; its hash identities and FAILED journals remain canonical history. Existing published Git history remains unchanged.
