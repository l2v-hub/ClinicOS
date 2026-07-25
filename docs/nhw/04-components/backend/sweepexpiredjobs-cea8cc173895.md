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
    line_start: "977"
    line_end: "993"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

- `backend/src/ai/upload/job-service.ts:977-993` — sweepExpiredJobs

## Related Knowledge

- `belongs-to` → `project.backend`
