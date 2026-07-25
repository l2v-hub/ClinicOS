---
id: 'component.backend.backend.src.ai.config.loadextractionprompt'
kind: 'typescript-function'
title: 'loadExtractionPrompt'
status: 'observed'
summary: 'Exported function from backend/src/ai/config.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/config.ts'
    symbol: 'loadExtractionPrompt'
    line_start: '145'
    line_end: '147'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/config.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.config.loadextractionprompt` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.config.loadextractionprompt is the canonical typescript-function named loadExtractionPrompt.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`
- `backend/src/ai/__tests__/extraction.test.ts`
- `backend/src/ai/upload/job-service.ts`

## Invariants

The symbol is exported across its module boundary as `loadExtractionPrompt`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/config.ts:145-147` — loadExtractionPrompt

## Related Knowledge

- `belongs-to` → `project.backend`
