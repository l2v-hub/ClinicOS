---
id: "component.backend.backend.src.ai.providers.google-gemma.googlegemmaextractionprovider"
kind: "typescript-class"
title: "GoogleGemmaExtractionProvider"
status: "observed"
summary: "Exported class from backend/src/ai/providers/google-gemma.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/providers/google-gemma.ts"
    symbol: "GoogleGemmaExtractionProvider"
    line_start: "32"
    line_end: "184"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/providers/google-gemma.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.providers.google-gemma.googlegemmaextractionprovider` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.providers.google-gemma.googlegemmaextractionprovider is the canonical typescript-class named GoogleGemmaExtractionProvider.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/provider-factory.ts`

## Invariants

The symbol is exported across its module boundary as `GoogleGemmaExtractionProvider`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/providers/google-gemma.ts:32-184` — GoogleGemmaExtractionProvider

## Related Knowledge

- `belongs-to` → `project.backend`
