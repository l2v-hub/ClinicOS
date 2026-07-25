---
id: "component.backend.backend.src.ai.gateway.filters.vitalnumericvalue"
kind: "typescript-function"
title: "vitalNumericValue"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "vitalNumericValue"
    line_start: "24"
    line_end: "38"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.vitalnumericvalue` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.vitalnumericvalue is the canonical typescript-function named vitalNumericValue.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`

## Invariants

The symbol is exported across its module boundary as `vitalNumericValue`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:24-38` — vitalNumericValue

## Related Knowledge

- `belongs-to` → `project.backend`
