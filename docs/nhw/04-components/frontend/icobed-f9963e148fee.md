---
id: "component.frontend.frontend.src.icons.icobed"
kind: "typescript-react-component"
title: "IcoBed"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoBed"
    line_start: "450"
    line_end: "464"
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

What does `component.frontend.frontend.src.icons.icobed` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icobed is the canonical typescript-react-component named IcoBed.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/admin/RoomsManagement.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/shared/TeamsLikeSidebar.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoBed`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:450-464` — IcoBed

## Related Knowledge

- `belongs-to` → `project.frontend`
