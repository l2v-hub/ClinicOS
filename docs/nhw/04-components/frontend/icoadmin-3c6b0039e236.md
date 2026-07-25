---
id: "component.frontend.frontend.src.icons.icoadmin"
kind: "typescript-react-component"
title: "IcoAdmin"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoAdmin"
    line_start: "425"
    line_end: "437"
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

What does `component.frontend.frontend.src.icons.icoadmin` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icoadmin is the canonical typescript-react-component named IcoAdmin.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/Login.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoAdmin`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:425-437` — IcoAdmin

## Related Knowledge

- `belongs-to` → `project.frontend`
