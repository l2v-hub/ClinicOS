---
id: 'component.backend.backend.src.ai.upload.job-service.retryjob'
kind: 'typescript-function'
title: 'retryJob'
status: 'observed'
summary: 'Exported function from backend/src/ai/upload/job-service.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/upload/job-service.ts'
    symbol: 'retryJob'
    line_start: '663'
    line_end: '675'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/upload/job-service.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.retryjob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.retryjob is the canonical typescript-function named retryJob.

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

## Invariants

The symbol is exported across its module boundary as `retryJob`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:663-675` — retryJob

## Related Knowledge

- `belongs-to` → `project.backend`
