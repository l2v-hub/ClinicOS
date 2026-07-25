---
id: 'component.backend.backend.src.ai.types.extractionwarning'
kind: 'typescript-interface'
title: 'ExtractionWarning'
status: 'observed'
summary: 'Exported interface from backend/src/ai/types.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/types.ts'
    symbol: 'ExtractionWarning'
    line_start: '27'
    line_end: '30'
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

What does `component.backend.backend.src.ai.types.extractionwarning` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.extractionwarning is the canonical typescript-interface named ExtractionWarning.

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

The symbol is exported across its module boundary as `ExtractionWarning`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:27-30` — ExtractionWarning

## Related Knowledge

- `belongs-to` → `project.backend`
