---
id: 'component.backend.backend.src.ai.extraction-validate.schemavalidation'
kind: 'typescript-interface'
title: 'SchemaValidation'
status: 'observed'
summary: 'Exported interface from backend/src/ai/extraction-validate.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/extraction-validate.ts'
    symbol: 'SchemaValidation'
    line_start: '17'
    line_end: '21'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/extraction-validate.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.extraction-validate.schemavalidation` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.extraction-validate.schemavalidation is the canonical typescript-interface named SchemaValidation.

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

The symbol is exported across its module boundary as `SchemaValidation`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/extraction-validate.ts:17-21` — SchemaValidation

## Related Knowledge

- `belongs-to` → `project.backend`
