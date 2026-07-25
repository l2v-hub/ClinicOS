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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
