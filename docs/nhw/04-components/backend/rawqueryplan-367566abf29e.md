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
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/dsl.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
