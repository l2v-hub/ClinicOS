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
    target: "project.backend"
    evidence: "backend/src/ai/providers/mock.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
