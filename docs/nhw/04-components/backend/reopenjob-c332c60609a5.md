---
id: 'component.backend.backend.src.ai.upload.job-service.reopenjob'
kind: 'typescript-function'
title: 'reopenJob'
status: 'observed'
summary: 'Exported function from backend/src/ai/upload/job-service.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/upload/job-service.ts'
    symbol: 'reopenJob'
    line_start: '659'
    line_end: '683'
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
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.reopenjob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.reopenjob is the canonical typescript-function named reopenJob.

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

The symbol is exported across its module boundary as `reopenJob`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:659-683` — reopenJob

## Related Knowledge

- `belongs-to` → `project.backend`
