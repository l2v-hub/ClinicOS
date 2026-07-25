---
id: "component.backend.backend.src.ai.gateway.filters.cartelladata"
kind: "typescript-interface"
title: "CartellaData"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "CartellaData"
    line_start: "95"
    line_end: "101"
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

What does `component.backend.backend.src.ai.gateway.filters.cartelladata` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.cartelladata is the canonical typescript-interface named CartellaData.

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

The symbol is exported across its module boundary as `CartellaData`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:95-101` — CartellaData

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
