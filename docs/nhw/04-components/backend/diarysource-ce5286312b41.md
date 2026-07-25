---
id: 'component.backend.backend.src.ai.gateway.sources.diarysource'
kind: 'typescript-function'
title: 'diarySource'
status: 'observed'
summary: 'Exported function from backend/src/ai/gateway/sources.ts.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'backend/src/ai/gateway/sources.ts'
    symbol: 'diarySource'
    line_start: '42'
    line_end: '50'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/sources.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.sources.diarysource` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.sources.diarysource is the canonical typescript-function named diarySource.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `diarySource`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/sources.ts:42-50` — diarySource

## Related Knowledge

- `belongs-to` → `project.backend`
