---
id: "component.backend.backend.src.ai.gateway.query.validate.max-relate"
kind: "typescript-constant"
title: "MAX_RELATE"
status: "observed"
summary: "Exported constant from backend/src/ai/gateway/query/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/validate.ts"
    symbol: "MAX_RELATE"
    line_start: "38"
    line_end: "38"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/query/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.validate.max-relate` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.validate.max-relate is the canonical typescript-constant named MAX_RELATE.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `MAX_RELATE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/validate.ts:38-38` — MAX_RELATE

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
