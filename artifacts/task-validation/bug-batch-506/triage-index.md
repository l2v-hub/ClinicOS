# Issue grouping

Batch: bug-batch-506
Baseline: 715a4b9e47ff9bd0192b7f58f24271e48da4900d
Feature: patient-intake/routed-workspace-presentation

Separate newly authorized issue; different root cause and nonoverlapping source files from the other new issue, preserving independent acceptance/evidence and ongoing automation reviews.

## Issue to affected files

[
  {
    "issue": 506,
    "files": [
      "e2e/issue506-workspace.mjs",
      "frontend/e2e/issue506-workspace.html",
      "frontend/e2e/issue506-workspace.tsx",
      "frontend/src/components/operator/NewPatientFlow.tsx",
      "frontend/src/components/shared/AccessibleDialogSurface.tsx",
      "frontend/src/components/shared/DialogLoading.tsx",
      "frontend/src/components/shared/DischargeImportModal.tsx",
      "frontend/src/components/shared/PatientWorkspaceSurface.css",
      "frontend/src/components/shared/PatientWorkspaceSurface.tsx",
      "frontend/src/components/shared/__tests__/workspacePresentation506.test.ts",
      "frontend/src/components/shared/intake/IntakeWorkspace.tsx",
      "frontend/src/lib/__tests__/manualIntakeNavigation.test.ts"
    ]
  }
]

## Separation from overlapping groups

Independent root causes and no shared changed source files: #506 page surfaces/navigation versus #507 therapy date provenance. Separate worktrees and per-issue PRs avoid coupling.

This is a new explicit source/evidence packet. Original unpublished C5 packet bytes were not recovered; its hash identities and FAILED journals remain canonical history. Existing published Git history remains unchanged.
