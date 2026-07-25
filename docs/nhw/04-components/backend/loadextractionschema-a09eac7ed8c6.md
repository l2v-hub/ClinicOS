---
id: 'component.backend.backend.src.ai.config.loadextractionschema'
kind: 'typescript-function'
title: 'loadExtractionSchema'
status: 'observed'
summary: 'Exported function from backend/src/ai/config.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/config.ts'
    symbol: 'loadExtractionSchema'
    line_start: '140'
    line_end: '142'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.config.loadextractionschema` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.config.loadextractionschema is the canonical typescript-function named loadExtractionSchema.

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
- `backend/src/routes/ai-extraction.ts`

## Invariants

The symbol is exported across its module boundary as `loadExtractionSchema`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/config.ts:140-142` — loadExtractionSchema

## Related Knowledge

- `belongs-to` → `project.backend`
