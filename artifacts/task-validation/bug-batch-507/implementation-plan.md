# Frozen implementation plan

Branch: codex/bug-batch-507
Baseline: 715a4b9e47ff9bd0192b7f58f24271e48da4900d

{
  "title": "Proponi la data di ingresso per le nuove terapie",
  "feature": "patient-therapy/admission-date-defaults",
  "rationale": "Separate newly authorized issue; different root cause and nonoverlapping source files from the other new issue, preserving independent acceptance/evidence and ongoing automation reviews.",
  "analysis": "Creation factory previously used facility today; actual chart admission is resolved from presaInCarico, intake uses ingresso.dataPresa. Late asynchronous context and explicit date edits require per-field default provenance.\nHarness-only evidence version: actual native C5 build/frontend tests passed; bundled Playwright qualified in40423083192. The same behavioral regression runs with a self-owned loopback server, sealed default environment and deterministic current evidence paths. All old plans, FAILED journals and four retained source snapshots remain preserved.",
  "execution": {
    "difficulty": "medium",
    "mode": "delegate",
    "reason": "Bounded delegated clinical date initialization with senior implementation; actual independent QA failure preserved and fixed before publication."
  },
  "issues": [
    507
  ],
  "scope": [
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
  ],
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
  "acceptance": [
    {
      "issue": 507,
      "criteria": [
        "New manual therapy start/once default dates use the actual resolved admission day, including delayed cartella hydration.",
        "Operator edits, saved/imported dates and explicit calendar dates retain precedence; no timezone shift of calendar dates.",
        "Independent actual-host and intake browser evidence, meaningful unit regressions, build, frontend tests and privacy checks pass with synthetic fixtures."
      ]
    }
  ],
  "tasks": [
    {
      "title": "Implement scoped cause and preserve existing invariants",
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
      ],
      "steps": [
        "New manual therapy start/once default dates use the actual resolved admission day, including delayed cartella hydration.",
        "Operator edits, saved/imported dates and explicit calendar dates retain precedence; no timezone shift of calendar dates.",
        "Independent actual-host and intake browser evidence, meaningful unit regressions, build, frontend tests and privacy checks pass with synthetic fixtures."
      ]
    }
  ],
  "verification": [
    {
      "command": "npm",
      "args": [
        "--prefix",
        "frontend",
        "run",
        "build"
      ]
    },
    {
      "command": "npm",
      "args": [
        "--prefix",
        "frontend",
        "test"
      ]
    },
    {
      "command": "node",
      "args": [
        "--import",
        "tsx",
        "e2e/issue507-smoke.mjs"
      ]
    }
  ],
  "evidence": [
    {
      "issue": 507,
      "screenshot": "artifacts/task-validation/bug-batch-507/evidence/screenshots/Europe-Rome-chart-admission.png",
      "trace": "artifacts/task-validation/bug-batch-507/evidence/trace/issue507-Europe-Rome.zip",
      "video": "artifacts/task-validation/bug-batch-507/evidence/video/issue507-Europe-Rome.webm"
    }
  ]
}
