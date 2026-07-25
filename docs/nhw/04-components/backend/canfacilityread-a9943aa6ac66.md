---
id: "component.backend.backend.src.ai.gateway.context.canfacilityread"
kind: "typescript-function"
title: "canFacilityRead"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "canFacilityRead"
    line_start: "81"
    line_end: "83"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/context.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.context.canfacilityread` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.canfacilityread is the canonical typescript-function named canFacilityRead.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/context-facility.test.ts`
- `backend/src/ai/assistant/service.ts`
- `backend/src/ai/gateway/query/engine.ts`

## Invariants

The symbol is exported across its module boundary as `canFacilityRead`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:81-83` — canFacilityRead

## Related Knowledge

- `belongs-to` → `project.backend`
