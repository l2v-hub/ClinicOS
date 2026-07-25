---
id: "component.frontend.frontend.src.types.prioritanota"
kind: "typescript-type-alias"
title: "PrioritaNota"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "PrioritaNota"
    line_start: "253"
    line_end: "253"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.types.prioritanota` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.prioritanota is the canonical typescript-type-alias named PrioritaNota.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/NotesPage.tsx`

## Invariants

The symbol is exported across its module boundary as `PrioritaNota`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:253-253` — PrioritaNota

## Related Knowledge

- `belongs-to` → `project.frontend`
