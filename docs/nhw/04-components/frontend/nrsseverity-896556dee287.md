---
id: "component.frontend.frontend.src.components.operator.cartella.scalanrstab.nrsseverity"
kind: "typescript-function"
title: "nrsSeverity"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/ScalaNRSTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ScalaNRSTab.tsx"
    symbol: "nrsSeverity"
    line_start: "16"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/ScalaNRSTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.scalanrstab.nrsseverity` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.scalanrstab.nrsseverity is the canonical typescript-function named nrsSeverity.

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

The symbol is exported across its module boundary as `nrsSeverity`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx:16-21` — nrsSeverity

## Related Knowledge

- `belongs-to` → `project.frontend`
