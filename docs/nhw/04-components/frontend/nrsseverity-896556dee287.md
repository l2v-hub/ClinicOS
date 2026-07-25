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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
