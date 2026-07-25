---
id: "component.frontend.frontend.src.types.ruolooperatore"
kind: "typescript-type-alias"
title: "RuoloOperatore"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/types.ts"
    symbol: "RuoloOperatore"
    line_start: "100"
    line_end: "100"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.types.ruolooperatore` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.ruolooperatore is the canonical typescript-type-alias named RuoloOperatore.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/OperatorManagement.tsx`

## Invariants

The symbol is exported across its module boundary as `RuoloOperatore`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:100-100` — RuoloOperatore

## Related Knowledge

- `belongs-to` → `project.frontend`
