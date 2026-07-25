---
id: "component.frontend.frontend.src.components.operator.inviopsmodal.buildinviopsmodel"
kind: "typescript-function"
title: "buildInvioPSModel"
status: "observed"
summary: "Exported function from frontend/src/components/operator/InvioPSModal.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/InvioPSModal.tsx"
    symbol: "buildInvioPSModel"
    line_start: "86"
    line_end: "197"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/InvioPSModal.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.inviopsmodal.buildinviopsmodel` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.inviopsmodal.buildinviopsmodel is the canonical typescript-function named buildInvioPSModel.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `buildInvioPSModel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/InvioPSModal.tsx:86-197` — buildInvioPSModel

## Related Knowledge

- `belongs-to` → `project.frontend`
