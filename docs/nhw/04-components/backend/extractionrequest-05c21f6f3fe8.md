---
id: 'component.backend.backend.src.ai.types.extractionrequest'
kind: 'typescript-interface'
title: 'ExtractionRequest'
status: 'observed'
summary: 'Exported interface from backend/src/ai/types.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/types.ts'
    symbol: 'ExtractionRequest'
    line_start: '18'
    line_end: '25'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.types.extractionrequest` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.extractionrequest is the canonical typescript-interface named ExtractionRequest.

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

The symbol is exported across its module boundary as `ExtractionRequest`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:18-25` — ExtractionRequest

## Related Knowledge

- `belongs-to` → `project.backend`
