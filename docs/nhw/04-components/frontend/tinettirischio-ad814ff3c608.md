---
id: "component.frontend.frontend.src.components.operator.cartella.scalatinettitab.tinettirischio"
kind: "typescript-function"
title: "tinettiRischio"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/ScalaTinettiTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ScalaTinettiTab.tsx"
    symbol: "tinettiRischio"
    line_start: "50"
    line_end: "54"
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

What does `component.frontend.frontend.src.components.operator.cartella.scalatinettitab.tinettirischio` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.scalatinettitab.tinettirischio is the canonical typescript-function named tinettiRischio.

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

The symbol is exported across its module boundary as `tinettiRischio`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:50-54` — tinettiRischio

## Related Knowledge

- `belongs-to` → `project.frontend`
