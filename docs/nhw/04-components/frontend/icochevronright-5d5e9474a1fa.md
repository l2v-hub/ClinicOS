---
id: "component.frontend.frontend.src.icons.icochevronright"
kind: "typescript-react-component"
title: "IcoChevronRight"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoChevronRight"
    line_start: "130"
    line_end: "141"
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

What does `component.frontend.frontend.src.icons.icochevronright` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icochevronright is the canonical typescript-react-component named IcoChevronRight.

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
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientList.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoChevronRight`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:130-141` — IcoChevronRight

## Related Knowledge

- `belongs-to` → `project.frontend`
