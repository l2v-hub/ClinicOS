---
id: "component.backend.backend.src.ai.gateway.query.schema.fielddef"
kind: "typescript-interface"
title: "FieldDef"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/query/schema.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/schema.ts"
    symbol: "FieldDef"
    line_start: "11"
    line_end: "17"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.schema.fielddef` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.schema.fielddef is the canonical typescript-interface named FieldDef.

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

The symbol is exported across its module boundary as `FieldDef`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/schema.ts:11-17` — FieldDef

## Related Knowledge

- `belongs-to` → `project.backend`
