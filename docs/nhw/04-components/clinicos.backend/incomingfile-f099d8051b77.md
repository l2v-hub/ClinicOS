---
id: "component.backend.backend.src.ai.upload.validation.incomingfile"
kind: "typescript-interface"
title: "IncomingFile"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/validation.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/validation.ts"
    symbol: "IncomingFile"
    line_start: "34"
    line_end: "38"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/validation.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.validation.incomingfile` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.validation.incomingfile is the canonical typescript-interface named IncomingFile.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/job-service.ts`
- `backend/src/routes/ai-jobs.ts`

## Invariants

The symbol is exported across its module boundary as `IncomingFile`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/validation.ts:34-38` — IncomingFile

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
