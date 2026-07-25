---
id: "component.backend.backend.src.ai.gateway.query.dsl.rawstep"
kind: "typescript-interface"
title: "RawStep"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/query/dsl.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/dsl.ts"
    symbol: "RawStep"
    line_start: "32"
    line_end: "43"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/dsl.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.dsl.rawstep` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.dsl.rawstep is the canonical typescript-interface named RawStep.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/validate.ts`

## Invariants

The symbol is exported across its module boundary as `RawStep`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/dsl.ts:32-43` — RawStep

## Related Knowledge

- `belongs-to` → `project.backend`
