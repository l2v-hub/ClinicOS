---
id: "component.backend.backend.src.ai.upload.job-service.jobstatus"
kind: "typescript-type-alias"
title: "JobStatus"
status: "observed"
summary: "Exported type-alias from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "JobStatus"
    line_start: "30"
    line_end: "46"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.jobstatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.jobstatus is the canonical typescript-type-alias named JobStatus.

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

The symbol is exported across its module boundary as `JobStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:30-46` — JobStatus

## Related Knowledge

- `belongs-to` → `project.backend`
