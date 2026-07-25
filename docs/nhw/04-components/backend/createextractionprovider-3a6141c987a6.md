---
id: "component.backend.backend.src.ai.provider-factory.createextractionprovider"
kind: "typescript-function"
title: "createExtractionProvider"
status: "observed"
summary: "Exported function from backend/src/ai/provider-factory.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/provider-factory.ts"
    symbol: "createExtractionProvider"
    line_start: "10"
    line_end: "30"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/provider-factory.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.provider-factory.createextractionprovider` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.provider-factory.createextractionprovider is the canonical typescript-function named createExtractionProvider.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`
- `backend/src/routes/ai-extraction.ts`

## Invariants

The symbol is exported across its module boundary as `createExtractionProvider`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/provider-factory.ts:10-30` — createExtractionProvider

## Related Knowledge

- `belongs-to` → `project.backend`
