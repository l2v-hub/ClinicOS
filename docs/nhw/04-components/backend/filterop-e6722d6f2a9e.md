---
id: "component.backend.backend.src.ai.gateway.query.dsl.filterop"
kind: "typescript-type-alias"
title: "FilterOp"
status: "observed"
summary: "Exported type-alias from backend/src/ai/gateway/query/dsl.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/dsl.ts"
    symbol: "FilterOp"
    line_start: "5"
    line_end: "6"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/dsl.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.dsl.filterop` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.dsl.filterop is the canonical typescript-type-alias named FilterOp.

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

The symbol is exported across its module boundary as `FilterOp`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/dsl.ts:5-6` — FilterOp

## Related Knowledge

- `belongs-to` → `project.backend`
