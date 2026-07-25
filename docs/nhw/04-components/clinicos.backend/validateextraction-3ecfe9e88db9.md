---
id: "component.backend.backend.src.ai.extraction-validate.validateextraction"
kind: "typescript-function"
title: "validateExtraction"
status: "observed"
summary: "Exported function from backend/src/ai/extraction-validate.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/extraction-validate.ts"
    symbol: "validateExtraction"
    line_start: "23"
    line_end: "32"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/extraction-validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.extraction-validate.validateextraction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.extraction-validate.validateextraction is the canonical typescript-function named validateExtraction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/extraction.test.ts`
- `backend/src/ai/providers/google-gemma.ts`

## Invariants

The symbol is exported across its module boundary as `validateExtraction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/extraction-validate.ts:23-32` — validateExtraction

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
