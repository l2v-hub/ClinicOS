---
id: "component.backend.backend.src.ai.upload.job-service.publicdocument"
kind: "typescript-interface"
title: "PublicDocument"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "PublicDocument"
    line_start: "56"
    line_end: "66"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.publicdocument` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.publicdocument is the canonical typescript-interface named PublicDocument.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PublicDocument`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:56-66` — PublicDocument

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
