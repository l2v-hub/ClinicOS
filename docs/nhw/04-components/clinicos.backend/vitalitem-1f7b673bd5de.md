---
id: "component.backend.backend.src.ai.gateway.filters.vitalitem"
kind: "typescript-interface"
title: "VitalItem"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "VitalItem"
    line_start: "40"
    line_end: "47"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.vitalitem` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.vitalitem is the canonical typescript-interface named VitalItem.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`
- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `VitalItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:40-47` — VitalItem

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
