---
id: "component.backend.backend.src.ai.upload.job-service.runjob"
kind: "typescript-function"
title: "runJob"
status: "observed"
summary: "Exported function from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "runJob"
    line_start: "702"
    line_end: "917"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.runjob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.runjob is the canonical typescript-function named runJob.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/scripts/confirm-smoke.mts`
- `backend/scripts/jobs-smoke.mts`
- `backend/src/ai/upload/worker.ts`
- `e2e/async-smoke.mjs`
- `e2e/import-e2e.mjs`
- `e2e/new-vs-existing-smoke.mjs`

## Invariants

The symbol is exported across its module boundary as `runJob`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:702-917` — runJob

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
