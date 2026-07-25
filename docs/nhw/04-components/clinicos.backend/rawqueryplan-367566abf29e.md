---
id: "component.backend.backend.src.ai.gateway.query.dsl.rawqueryplan"
kind: "typescript-interface"
title: "RawQueryPlan"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/query/dsl.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/dsl.ts"
    symbol: "RawQueryPlan"
    line_start: "45"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/query/dsl.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.dsl.rawqueryplan` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.dsl.rawqueryplan is the canonical typescript-interface named RawQueryPlan.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/validate.ts`

## Invariants

The symbol is exported across its module boundary as `RawQueryPlan`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/dsl.ts:45-48` — RawQueryPlan

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
