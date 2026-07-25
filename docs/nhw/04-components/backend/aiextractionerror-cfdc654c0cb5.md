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
    target: "project.backend"
    evidence: "backend/src/ai/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
