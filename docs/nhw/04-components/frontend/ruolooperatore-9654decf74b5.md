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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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
