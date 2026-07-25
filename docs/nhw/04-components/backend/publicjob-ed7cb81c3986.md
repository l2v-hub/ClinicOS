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
    target: "project.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
