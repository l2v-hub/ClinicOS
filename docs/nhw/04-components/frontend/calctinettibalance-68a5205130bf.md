---
id: "component.frontend.frontend.src.components.operator.cartella.scalatinettitab.calctinettibalance"
kind: "typescript-function"
title: "calcTinettiBalance"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/ScalaTinettiTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ScalaTinettiTab.tsx"
    symbol: "calcTinettiBalance"
    line_start: "16"
    line_end: "29"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.scalatinettitab.calctinettibalance` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.scalatinettitab.calctinettibalance is the canonical typescript-function named calcTinettiBalance.

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

The symbol is exported across its module boundary as `calcTinettiBalance`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx:16-29` — calcTinettiBalance

## Related Knowledge

- `belongs-to` → `project.frontend`
