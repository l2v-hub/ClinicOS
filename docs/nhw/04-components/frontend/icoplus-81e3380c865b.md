---
id: "component.frontend.frontend.src.icons.icoplus"
kind: "typescript-react-component"
title: "IcoPlus"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoPlus"
    line_start: "311"
    line_end: "323"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icoplus` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icoplus is the canonical typescript-react-component named IcoPlus.

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
- `frontend/src/components/admin/OperatorManagement.tsx`
- `frontend/src/components/admin/RoomsManagement.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- `frontend/src/components/shared/AppointmentForm.tsx`
- `frontend/src/components/shared/NotesPage.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoPlus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:311-323` — IcoPlus

## Related Knowledge

- `belongs-to` → `project.frontend`
