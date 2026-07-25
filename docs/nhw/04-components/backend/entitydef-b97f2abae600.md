---
id: "component.backend.backend.src.ai.gateway.query.schema.entitydef"
kind: "typescript-interface"
title: "EntityDef"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/query/schema.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/schema.ts"
    symbol: "EntityDef"
    line_start: "24"
    line_end: "34"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/schema.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.schema.entitydef` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.schema.entitydef is the canonical typescript-interface named EntityDef.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `EntityDef`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/schema.ts:24-34` — EntityDef

## Related Knowledge

- `belongs-to` → `project.backend`
