---
id: "component.backend.backend.src.ai.gateway.sources.roomoccupancysource"
kind: "typescript-function"
title: "roomOccupancySource"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/sources.ts."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "backend/src/ai/gateway/sources.ts"
    symbol: "roomOccupancySource"
    line_start: "83"
    line_end: "92"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/sources.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.sources.roomoccupancysource` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.sources.roomoccupancysource is the canonical typescript-function named roomOccupancySource.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `roomOccupancySource`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/sources.ts:83-92` — roomOccupancySource

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
