---
id: 'component.backend.backend.src.ai.extraction-validate.validateextraction'
kind: 'typescript-function'
title: 'validateExtraction'
status: 'observed'
summary: 'Exported function from backend/src/ai/extraction-validate.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/extraction-validate.ts'
    symbol: 'validateExtraction'
    line_start: '23'
    line_end: '32'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/extraction-validate.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.extraction-validate.validateextraction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.extraction-validate.validateextraction is the canonical typescript-function named validateExtraction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/extraction.test.ts`
- `backend/src/ai/providers/google-gemma.ts`

## Invariants

The symbol is exported across its module boundary as `validateExtraction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/extraction-validate.ts:23-32` — validateExtraction

## Related Knowledge

- `belongs-to` → `project.backend`
