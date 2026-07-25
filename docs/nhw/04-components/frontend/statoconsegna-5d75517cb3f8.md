---
id: "component.frontend.frontend.src.types.statoconsegna"
kind: "typescript-type-alias"
title: "StatoConsegna"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "StatoConsegna"
    line_start: "135"
    line_end: "135"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.types.statoconsegna` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.statoconsegna is the canonical typescript-type-alias named StatoConsegna.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/ConsegnePage.tsx`

## Invariants

The symbol is exported across its module boundary as `StatoConsegna`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:135-135` — StatoConsegna

## Related Knowledge

- `belongs-to` → `project.frontend`
