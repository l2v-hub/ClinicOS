---
id: "component.frontend.frontend.src.types.farmacoitem"
kind: "typescript-interface"
title: "FarmacoItem"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "FarmacoItem"
    line_start: "351"
    line_end: "368"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.types.farmacoitem` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.farmacoitem is the canonical typescript-interface named FarmacoItem.

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

The symbol is exported across its module boundary as `FarmacoItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:351-368` — FarmacoItem

## Related Knowledge

- `belongs-to` → `project.frontend`
