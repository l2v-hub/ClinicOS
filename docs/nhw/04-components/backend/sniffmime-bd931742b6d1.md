---
id: 'component.backend.backend.src.ai.upload.mime-sniff.sniffmime'
kind: 'typescript-function'
title: 'sniffMime'
status: 'observed'
summary: 'Exported function from backend/src/ai/upload/mime-sniff.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/upload/mime-sniff.ts'
    symbol: 'sniffMime'
    line_start: '32'
    line_end: '57'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/upload/mime-sniff.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.upload.mime-sniff.sniffmime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.mime-sniff.sniffmime is the canonical typescript-function named sniffMime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/upload.test.ts`
- `backend/src/ai/upload/validation.ts`

## Invariants

The symbol is exported across its module boundary as `sniffMime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/mime-sniff.ts:32-57` — sniffMime

## Related Knowledge

- `belongs-to` → `project.backend`
