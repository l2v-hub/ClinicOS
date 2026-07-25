---
id: "component.frontend.frontend.src.types.parametrovitale"
kind: "typescript-interface"
title: "ParametroVitale"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "ParametroVitale"
    line_start: "290"
    line_end: "296"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.types.parametrovitale` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.parametrovitale is the canonical typescript-interface named ParametroVitale.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `ParametroVitale`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:290-296` — ParametroVitale

## Related Knowledge

- `belongs-to` → `project.frontend`
