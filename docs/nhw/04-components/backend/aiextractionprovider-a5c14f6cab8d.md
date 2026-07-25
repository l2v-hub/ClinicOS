---
id: "component.backend.backend.src.ai.types.aiextractionprovider"
kind: "typescript-interface"
title: "AiExtractionProvider"
status: "observed"
summary: "Exported interface from backend/src/ai/types.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/types.ts"
    symbol: "AiExtractionProvider"
    line_start: "70"
    line_end: "77"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.types.aiextractionprovider` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.aiextractionprovider is the canonical typescript-interface named AiExtractionProvider.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/provider-factory.ts`
- `backend/src/ai/providers/google-gemma.ts`
- `backend/src/ai/providers/mock.ts`

## Invariants

The symbol is exported across its module boundary as `AiExtractionProvider`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:70-77` — AiExtractionProvider

## Related Knowledge

- `belongs-to` → `project.backend`
