---
id: 'component.backend.backend.src.ai.types.extractionresult'
kind: 'typescript-interface'
title: 'ExtractionResult'
status: 'observed'
summary: 'Exported interface from backend/src/ai/types.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/types.ts'
    symbol: 'ExtractionResult'
    line_start: '32'
    line_end: '43'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/types.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.types.extractionresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.extractionresult is the canonical typescript-interface named ExtractionResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/providers/google-gemma.ts`
- `backend/src/ai/providers/mock.ts`

## Invariants

The symbol is exported across its module boundary as `ExtractionResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:32-43` — ExtractionResult

## Related Knowledge

- `belongs-to` → `project.backend`
