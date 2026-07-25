---
id: "component.frontend.frontend.src.types.tipointervento"
kind: "typescript-type-alias"
title: "TipoIntervento"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TipoIntervento"
    line_start: "168"
    line_end: "169"
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

What does `component.frontend.frontend.src.types.tipointervento` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.tipointervento is the canonical typescript-type-alias named TipoIntervento.

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
- `frontend/src/components/shared/AppointmentForm.tsx`

## Invariants

The symbol is exported across its module boundary as `TipoIntervento`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:168-169` — TipoIntervento

## Related Knowledge

- `belongs-to` → `project.frontend`
