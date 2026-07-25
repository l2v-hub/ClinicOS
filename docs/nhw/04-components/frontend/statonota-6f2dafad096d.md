---
id: "component.frontend.frontend.src.types.statonota"
kind: "typescript-type-alias"
title: "StatoNota"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "StatoNota"
    line_start: "254"
    line_end: "254"
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

What does `component.frontend.frontend.src.types.statonota` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.statonota is the canonical typescript-type-alias named StatoNota.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/shared/NotesPage.tsx`

## Invariants

The symbol is exported across its module boundary as `StatoNota`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:254-254` — StatoNota

## Related Knowledge

- `belongs-to` → `project.frontend`
