---
id: "component.frontend.frontend.src.components.operator.sections.diagnosiseditor.diagnosiseditor"
kind: "typescript-react-component"
title: "DiagnosisEditor"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/sections/DiagnosisEditor.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/DiagnosisEditor.tsx"
    symbol: "DiagnosisEditor"
    line_start: "49"
    line_end: "302"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/DiagnosisEditor.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.diagnosiseditor.diagnosiseditor` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.diagnosiseditor.diagnosiseditor is the canonical typescript-react-component named DiagnosisEditor.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/sections/patientSections.ts`

## Invariants

The symbol is exported across its module boundary as `DiagnosisEditor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/DiagnosisEditor.tsx:49-302` — DiagnosisEditor

## Related Knowledge

- `belongs-to` → `project.frontend`
