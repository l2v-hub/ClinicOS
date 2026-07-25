---
id: "component.frontend.frontend.src.icons.icoedit"
kind: "typescript-react-component"
title: "IcoEdit"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoEdit"
    line_start: "339"
    line_end: "351"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icoedit` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icoedit is the canonical typescript-react-component named IcoEdit.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/ExpCard.tsx`
- `frontend/src/components/admin/OperatorManagement.tsx`
- `frontend/src/components/admin/OperatorSchedule.tsx`
- `frontend/src/components/admin/RoomsManagement.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`
- `frontend/src/components/shared/InlineEditableField.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoEdit`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:339-351` — IcoEdit

## Related Knowledge

- `belongs-to` → `project.frontend`
