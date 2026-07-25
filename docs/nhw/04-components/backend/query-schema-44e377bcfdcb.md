---
id: "component.backend.backend.src.ai.gateway.query.schema.query-schema"
kind: "typescript-constant"
title: "QUERY_SCHEMA"
status: "observed"
summary: "Exported constant from backend/src/ai/gateway/query/schema.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/schema.ts"
    symbol: "QUERY_SCHEMA"
    line_start: "40"
    line_end: "109"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/schema.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.schema.query-schema` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.schema.query-schema is the canonical typescript-constant named QUERY_SCHEMA.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/query-schema.test.ts`

## Invariants

The symbol is exported across its module boundary as `QUERY_SCHEMA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/schema.ts:40-109` — QUERY_SCHEMA

## Related Knowledge

- `belongs-to` → `project.backend`
