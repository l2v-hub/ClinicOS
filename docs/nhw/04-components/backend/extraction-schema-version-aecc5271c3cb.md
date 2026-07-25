---
id: 'component.backend.backend.src.ai.version.extraction-schema-version'
kind: 'typescript-constant'
title: 'EXTRACTION_SCHEMA_VERSION'
status: 'observed'
summary: 'Exported constant from backend/src/ai/version.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'backend/src/ai/version.ts'
    symbol: 'EXTRACTION_SCHEMA_VERSION'
    line_start: '4'
    line_end: '4'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/version.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.version.extraction-schema-version` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.version.extraction-schema-version is the canonical typescript-constant named EXTRACTION_SCHEMA_VERSION.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/config.ts`
- `backend/src/ai/providers/google-gemma.ts`
- `backend/src/ai/providers/mock.ts`

## Invariants

The symbol is exported across its module boundary as `EXTRACTION_SCHEMA_VERSION`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/version.ts:4-4` — EXTRACTION_SCHEMA_VERSION

## Related Knowledge

- `belongs-to` → `project.backend`
