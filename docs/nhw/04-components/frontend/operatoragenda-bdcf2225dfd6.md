---
id: "component.frontend.frontend.src.components.operator.operatoragenda.operatoragenda"
kind: "typescript-react-component"
title: "OperatorAgenda"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/OperatorAgenda.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/OperatorAgenda.tsx"
    symbol: "OperatorAgenda"
    line_start: "108"
    line_end: "609"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/OperatorAgenda.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.operatoragenda.operatoragenda` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.operatoragenda.operatoragenda is the canonical typescript-react-component named OperatorAgenda.

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

The symbol is exported across its module boundary as `OperatorAgenda`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/OperatorAgenda.tsx:108-609` — OperatorAgenda

## Related Knowledge

- `belongs-to` → `project.frontend`
