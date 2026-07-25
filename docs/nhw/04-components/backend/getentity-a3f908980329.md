---
id: "component.backend.backend.src.ai.gateway.query.schema.getentity"
kind: "typescript-function"
title: "getEntity"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/query/schema.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/schema.ts"
    symbol: "getEntity"
    line_start: "111"
    line_end: "113"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/schema.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.schema.getentity` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.schema.getentity is the canonical typescript-function named getEntity.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/query-schema.test.ts`
- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/query/validate.ts`

## Invariants

The symbol is exported across its module boundary as `getEntity`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/schema.ts:111-113` — getEntity

## Related Knowledge

- `belongs-to` → `project.backend`
