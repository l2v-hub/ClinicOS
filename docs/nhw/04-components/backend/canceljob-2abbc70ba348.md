---
id: 'component.backend.backend.src.ai.upload.job-service.canceljob'
kind: 'typescript-function'
title: 'cancelJob'
status: 'observed'
summary: 'Exported function from backend/src/ai/upload/job-service.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/upload/job-service.ts'
    symbol: 'cancelJob'
    line_start: '599'
    line_end: '607'
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

What does `component.backend.backend.src.ai.upload.job-service.canceljob` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.canceljob is the canonical typescript-function named cancelJob.

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

The symbol is exported across its module boundary as `cancelJob`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:599-607` — cancelJob

## Related Knowledge

- `belongs-to` → `project.backend`
