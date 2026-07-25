---
id: "component.backend.backend.src.ai.gateway.query.engine.runqueryplan"
kind: "typescript-function"
title: "runQueryPlan"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/query/engine.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/engine.ts"
    symbol: "runQueryPlan"
    line_start: "225"
    line_end: "263"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/engine.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.engine.runqueryplan` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.engine.runqueryplan is the canonical typescript-function named runQueryPlan.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/query-engine.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `runQueryPlan`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/engine.ts:225-263` — runQueryPlan

## Related Knowledge

- `belongs-to` → `project.backend`
