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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
