---
id: "component.backend.backend.src.ai.types.aiextractionerror"
kind: "typescript-class"
title: "AiExtractionError"
status: "observed"
summary: "Exported class from backend/src/ai/types.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/types.ts"
    symbol: "AiExtractionError"
    line_start: "54"
    line_end: "61"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.types.aiextractionerror` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.aiextractionerror is the canonical typescript-class named AiExtractionError.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/provider-factory.ts`
- `backend/src/ai/providers/google-gemma.ts`
- `backend/src/ai/upload/confirm-service.ts`
- `backend/src/ai/upload/job-service.ts`
- `backend/src/routes/ai-jobs.ts`
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `AiExtractionError`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:54-61` — AiExtractionError

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
