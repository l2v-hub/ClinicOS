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
    target: "project.backend"
    evidence: "backend/src/ai/gateway/sources.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
