---
id: "component.backend.backend.src.ai.providers.mock.mockextractionprovider"
kind: "typescript-class"
title: "MockExtractionProvider"
status: "observed"
summary: "Exported class from backend/src/ai/providers/mock.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/providers/mock.ts"
    symbol: "MockExtractionProvider"
    line_start: "13"
    line_end: "60"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/providers/mock.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.providers.mock.mockextractionprovider` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.providers.mock.mockextractionprovider is the canonical typescript-class named MockExtractionProvider.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`
- `backend/src/ai/__tests__/extraction.test.ts`
- `backend/src/ai/provider-factory.ts`

## Invariants

The symbol is exported across its module boundary as `MockExtractionProvider`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/providers/mock.ts:13-60` — MockExtractionProvider

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
