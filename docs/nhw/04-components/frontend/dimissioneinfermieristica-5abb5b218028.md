---
id: "component.frontend.frontend.src.types.dimissioneinfermieristica"
kind: "typescript-interface"
title: "DimissioneInfermieristica"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "DimissioneInfermieristica"
    line_start: "813"
    line_end: "887"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.types.dimissioneinfermieristica` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.dimissioneinfermieristica is the canonical typescript-interface named DimissioneInfermieristica.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/InvioPSModal.tsx`
- `frontend/src/components/operator/cartella/DimissioneTab.tsx`

## Invariants

The symbol is exported across its module boundary as `DimissioneInfermieristica`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:813-887` — DimissioneInfermieristica

## Related Knowledge

- `belongs-to` → `project.frontend`
