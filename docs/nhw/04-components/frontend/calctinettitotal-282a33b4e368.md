---
id: "component.frontend.frontend.src.components.operator.cartella.scalatinettitab.calctinettitotal"
kind: "typescript-function"
title: "calcTinettiTotal"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/ScalaTinettiTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ScalaTinettiTab.tsx"
    symbol: "calcTinettiTotal"
    line_start: "46"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/ScalaTinettiTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.scalatinettitab.calctinettitotal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.scalatinettitab.calctinettitotal is the canonical typescript-function named calcTinettiTotal.

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

The symbol is exported across its module boundary as `calcTinettiTotal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:46-48` — calcTinettiTotal

## Related Knowledge

- `belongs-to` → `project.frontend`
