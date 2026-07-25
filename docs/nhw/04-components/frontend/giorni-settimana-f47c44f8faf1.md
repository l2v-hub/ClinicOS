---
id: "component.frontend.frontend.src.types.giorni-settimana"
kind: "typescript-constant"
title: "GIORNI_SETTIMANA"
status: "observed"
summary: "Exported constant from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "GIORNI_SETTIMANA"
    line_start: "217"
    line_end: "225"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.types.giorni-settimana` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.giorni-settimana is the canonical typescript-constant named GIORNI_SETTIMANA.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/OperatorSchedule.tsx`

## Invariants

The symbol is exported across its module boundary as `GIORNI_SETTIMANA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:217-225` — GIORNI_SETTIMANA

## Related Knowledge

- `belongs-to` → `project.frontend`
