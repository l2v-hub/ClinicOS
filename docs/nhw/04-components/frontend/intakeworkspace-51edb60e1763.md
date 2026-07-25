---
id: "component.frontend.frontend.src.components.shared.intake.intakeworkspace.intakeworkspace"
kind: "typescript-react-component"
title: "IntakeWorkspace"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/intake/IntakeWorkspace.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/IntakeWorkspace.tsx"
    symbol: "IntakeWorkspace"
    line_start: "141"
    line_end: "629"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/IntakeWorkspace.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.intakeworkspace.intakeworkspace` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.intakeworkspace.intakeworkspace is the canonical typescript-react-component named IntakeWorkspace.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminAgenda.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/shared/DischargeImportModal.tsx`

## Invariants

The symbol is exported across its module boundary as `IntakeWorkspace`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/IntakeWorkspace.tsx:141-629` — IntakeWorkspace

## Related Knowledge

- `belongs-to` → `project.frontend`
