---
id: 'component.backend.backend.src.ai.auth.requireoperator'
kind: 'typescript-function'
title: 'requireOperator'
status: 'observed'
summary: 'Exported function from backend/src/ai/auth.ts.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'backend/src/ai/auth.ts'
    symbol: 'requireOperator'
    line_start: '24'
    line_end: '38'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/auth.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.auth.requireoperator` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.auth.requireoperator is the canonical typescript-function named requireOperator.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/security.test.ts`
- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/ai-assistant-public.ts`
- `backend/src/routes/ai-audit.ts`
- `backend/src/routes/ai-jobs.ts`
- `backend/src/routes/ai-voice.ts`
- `backend/src/routes/intake-drafts.ts`
- `backend/src/routes/patient-documents.ts`

## Invariants

The symbol is exported across its module boundary as `requireOperator`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/auth.ts:24-38` — requireOperator

## Related Knowledge

- `belongs-to` → `project.backend`
