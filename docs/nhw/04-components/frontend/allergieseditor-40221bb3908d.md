---
id: "component.frontend.frontend.src.components.operator.sections.allergieseditor.allergieseditor"
kind: "typescript-react-component"
title: "AllergiesEditor"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/sections/AllergiesEditor.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/AllergiesEditor.tsx"
    symbol: "AllergiesEditor"
    line_start: "22"
    line_end: "228"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/AllergiesEditor.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.allergieseditor.allergieseditor` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.allergieseditor.allergieseditor is the canonical typescript-react-component named AllergiesEditor.

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

The symbol is exported across its module boundary as `AllergiesEditor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/AllergiesEditor.tsx:22-228` — AllergiesEditor

## Related Knowledge

- `belongs-to` → `project.frontend`
