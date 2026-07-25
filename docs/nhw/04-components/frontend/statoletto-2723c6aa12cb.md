---
id: "component.frontend.frontend.src.types.statoletto"
kind: "typescript-type-alias"
title: "StatoLetto"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "StatoLetto"
    line_start: "189"
    line_end: "189"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.types.statoletto` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.statoletto is the canonical typescript-type-alias named StatoLetto.

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

The symbol is exported across its module boundary as `StatoLetto`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:189-189` — StatoLetto

## Related Knowledge

- `belongs-to` → `project.frontend`
