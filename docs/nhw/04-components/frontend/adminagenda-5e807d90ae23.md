---
id: "component.frontend.frontend.src.components.admin.adminagenda.adminagenda"
kind: "typescript-react-component"
title: "AdminAgenda"
status: "observed"
summary: "Exported react-component from frontend/src/components/admin/AdminAgenda.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/admin/AdminAgenda.tsx"
    symbol: "AdminAgenda"
    line_start: "83"
    line_end: "474"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/admin/AdminAgenda.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.admin.adminagenda.adminagenda` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.admin.adminagenda.adminagenda is the canonical typescript-react-component named AdminAgenda.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `AdminAgenda`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/admin/AdminAgenda.tsx:83-474` — AdminAgenda

## Related Knowledge

- `belongs-to` → `project.frontend`
