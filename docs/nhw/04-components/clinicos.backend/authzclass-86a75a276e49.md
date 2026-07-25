---
id: "component.backend.backend.src.ai.gateway.query.schema.authzclass"
kind: "typescript-type-alias"
title: "AuthzClass"
status: "observed"
summary: "Exported type-alias from backend/src/ai/gateway/query/schema.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/ai/gateway/query/schema.ts"
    symbol: "AuthzClass"
    line_start: "9"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/query/schema.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.schema.authzclass` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.schema.authzclass is the canonical typescript-type-alias named AuthzClass.

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

The symbol is exported across its module boundary as `AuthzClass`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/schema.ts:9-9` — AuthzClass

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
