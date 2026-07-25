---
id: 'component.backend.backend.src.ai.rate-limit.extractioncostguard'
kind: 'typescript-constant'
title: 'extractionCostGuard'
status: 'observed'
summary: 'Exported constant from backend/src/ai/rate-limit.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/rate-limit.ts'
    symbol: 'extractionCostGuard'
    line_start: '44'
    line_end: '48'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/rate-limit.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.rate-limit.extractioncostguard` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.rate-limit.extractioncostguard is the canonical typescript-constant named extractionCostGuard.

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

## Invariants

The symbol is exported across its module boundary as `extractionCostGuard`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/rate-limit.ts:44-48` — extractionCostGuard

## Related Knowledge

- `belongs-to` → `project.backend`
