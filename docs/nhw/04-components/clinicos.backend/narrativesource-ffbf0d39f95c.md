---
id: "component.backend.backend.src.ai.gateway.sources.narrativesource"
kind: "typescript-function"
title: "narrativeSource"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/sources.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/gateway/sources.ts"
    symbol: "narrativeSource"
    line_start: "14"
    line_end: "30"
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

What does `component.backend.backend.src.ai.gateway.sources.narrativesource` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.sources.narrativesource is the canonical typescript-function named narrativeSource.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `narrativeSource`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/sources.ts:14-30` — narrativeSource

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
