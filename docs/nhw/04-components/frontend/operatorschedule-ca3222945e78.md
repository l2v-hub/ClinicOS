---
id: "component.frontend.frontend.src.components.admin.operatorschedule.operatorschedule"
kind: "typescript-react-component"
title: "OperatorSchedule"
status: "observed"
summary: "Exported react-component from frontend/src/components/admin/OperatorSchedule.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/admin/OperatorSchedule.tsx"
    symbol: "OperatorSchedule"
    line_start: "16"
    line_end: "259"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/admin/OperatorSchedule.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.admin.operatorschedule.operatorschedule` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.admin.operatorschedule.operatorschedule is the canonical typescript-react-component named OperatorSchedule.

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

The symbol is exported across its module boundary as `OperatorSchedule`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/admin/OperatorSchedule.tsx:16-259` — OperatorSchedule

## Related Knowledge

- `belongs-to` → `project.frontend`
