---
id: "component.backend.backend.src.ai.upload.job-service.sweepexpiredjobs"
kind: "typescript-function"
title: "sweepExpiredJobs"
status: "observed"
summary: "Exported function from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "sweepExpiredJobs"
    line_start: "1043"
    line_end: "1059"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.sweepexpiredjobs` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.sweepexpiredjobs is the canonical typescript-function named sweepExpiredJobs.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-jobs.ts`
- `backend/src/server.ts`

## Invariants

The symbol is exported across its module boundary as `sweepExpiredJobs`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:1043-1059` — sweepExpiredJobs

## Related Knowledge

- `belongs-to` → `project.backend`
