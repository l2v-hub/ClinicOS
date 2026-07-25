---
id: "component.backend.backend.src.ai.gateway.services.correlate"
kind: "typescript-function"
title: "correlate"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/services.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/services.ts"
    symbol: "correlate"
    line_start: "489"
    line_end: "555"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/services.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.correlate` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.correlate is the canonical typescript-function named correlate.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `correlate`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:489-555` — correlate

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
