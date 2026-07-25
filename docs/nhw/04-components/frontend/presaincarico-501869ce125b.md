---
id: "component.frontend.frontend.src.types.presaincarico"
kind: "typescript-interface"
title: "PresaInCarico"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "PresaInCarico"
    line_start: "510"
    line_end: "550"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.types.presaincarico` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.presaincarico is the canonical typescript-interface named PresaInCarico.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`

## Invariants

The symbol is exported across its module boundary as `PresaInCarico`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:510-550` — PresaInCarico

## Related Knowledge

- `belongs-to` → `project.frontend`
