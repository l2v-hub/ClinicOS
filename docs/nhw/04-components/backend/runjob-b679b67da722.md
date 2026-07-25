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

What does `component.backend.backend.src.ai.upload.job-service.runjob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.runjob is the canonical typescript-function named runJob.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
