---
id: "component.backend.backend.src.ai.gateway.filters.ascartella"
kind: "typescript-function"
title: "asCartella"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "asCartella"
    line_start: "116"
    line_end: "118"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.ascartella` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.ascartella is the canonical typescript-function named asCartella.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`
- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `asCartella`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:116-118` — asCartella

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
