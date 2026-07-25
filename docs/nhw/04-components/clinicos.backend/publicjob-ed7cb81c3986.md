---
id: "component.backend.backend.src.ai.upload.job-service.publicjob"
kind: "typescript-interface"
title: "PublicJob"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "PublicJob"
    line_start: "68"
    line_end: "88"
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

What does `component.backend.backend.src.ai.upload.job-service.publicjob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.publicjob is the canonical typescript-interface named PublicJob.

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

The symbol is exported across its module boundary as `PublicJob`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:68-88` — PublicJob

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
