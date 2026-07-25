---
id: "component.frontend.frontend.src.components.operator.cartella.shared.tabheader"
kind: "typescript-react-component"
title: "TabHeader"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/shared.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/shared.tsx"
    symbol: "TabHeader"
    line_start: "130"
    line_end: "137"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/shared.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.shared.tabheader` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.tabheader is the canonical typescript-react-component named TabHeader.

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

The symbol is exported across its module boundary as `TabHeader`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:130-137` — TabHeader

## Related Knowledge

- `belongs-to` → `project.frontend`
