---
id: "component.frontend.frontend.src.components.operator.cartella.dimissionetab.dimissionetab"
kind: "typescript-react-component"
title: "DimissioneTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/DimissioneTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/DimissioneTab.tsx"
    symbol: "DimissioneTab"
    line_start: "560"
    line_end: "1609"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/DimissioneTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.dimissionetab.dimissionetab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.dimissionetab.dimissionetab is the canonical typescript-react-component named DimissioneTab.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `DimissioneTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/DimissioneTab.tsx:560-1609` — DimissioneTab

## Related Knowledge

- `belongs-to` → `project.frontend`
