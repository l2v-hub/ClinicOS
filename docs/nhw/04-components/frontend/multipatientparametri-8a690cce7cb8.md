---
id: "component.frontend.frontend.src.components.operator.multipatientparametri.multipatientparametri"
kind: "typescript-react-component"
title: "MultiPatientParametri"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/MultiPatientParametri.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/MultiPatientParametri.tsx"
    symbol: "MultiPatientParametri"
    line_start: "325"
    line_end: "490"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/MultiPatientParametri.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.multipatientparametri.multipatientparametri` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.multipatientparametri.multipatientparametri is the canonical typescript-react-component named MultiPatientParametri.

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

The symbol is exported across its module boundary as `MultiPatientParametri`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/MultiPatientParametri.tsx:325-490` — MultiPatientParametri

## Related Knowledge

- `belongs-to` → `project.frontend`
