---
id: "component.backend.backend.src.ai.gateway.query.validate.validatedplan"
kind: "typescript-interface"
title: "ValidatedPlan"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/query/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/validate.ts"
    symbol: "ValidatedPlan"
    line_start: "31"
    line_end: "34"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/query/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.validate.validatedplan` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.validate.validatedplan is the canonical typescript-interface named ValidatedPlan.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/engine.ts`

## Invariants

The symbol is exported across its module boundary as `ValidatedPlan`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/validate.ts:31-34` — ValidatedPlan

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
