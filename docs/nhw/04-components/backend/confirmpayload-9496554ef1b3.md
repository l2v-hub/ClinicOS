---
id: 'component.backend.backend.src.ai.upload.confirm-service.confirmpayload'
kind: 'typescript-interface'
title: 'ConfirmPayload'
status: 'observed'
summary: 'Exported interface from backend/src/ai/upload/confirm-service.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/upload/confirm-service.ts'
    symbol: 'ConfirmPayload'
    line_start: '52'
    line_end: '66'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/upload/confirm-service.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.upload.confirm-service.confirmpayload` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.confirm-service.confirmpayload is the canonical typescript-interface named ConfirmPayload.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-jobs.ts`
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `ConfirmPayload`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/confirm-service.ts:52-66` — ConfirmPayload

## Related Knowledge

- `belongs-to` → `project.backend`
