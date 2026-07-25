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
    target: "project.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
