---
id: 'component.backend.backend.src.ai.upload.job-service.getjobresult'
kind: 'typescript-function'
title: 'getJobResult'
status: 'observed'
summary: 'Exported function from backend/src/ai/upload/job-service.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/upload/job-service.ts'
    symbol: 'getJobResult'
    line_start: '986'
    line_end: '1000'
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

What does `component.backend.backend.src.ai.upload.job-service.getjobresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.getjobresult is the canonical typescript-function named getJobResult.

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

The symbol is exported across its module boundary as `getJobResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:986-1000` — getJobResult

## Related Knowledge

- `belongs-to` → `project.backend`
