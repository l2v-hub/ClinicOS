---
id: "component.frontend.frontend.src.components.operator.inviopsmodal.inviopsmodel"
kind: "typescript-interface"
title: "InvioPSModel"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/InvioPSModal.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/InvioPSModal.tsx"
    symbol: "InvioPSModel"
    line_start: "65"
    line_end: "69"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/InvioPSModal.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.inviopsmodal.inviopsmodel` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.inviopsmodal.inviopsmodel is the canonical typescript-interface named InvioPSModel.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `InvioPSModel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/InvioPSModal.tsx:65-69` — InvioPSModel

## Related Knowledge

- `belongs-to` → `project.frontend`
