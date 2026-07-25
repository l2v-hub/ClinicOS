---
id: 'component.backend.backend.src.ai.voice.preview.buildpreview'
kind: 'typescript-function'
title: 'buildPreview'
status: 'observed'
summary: 'Exported function from backend/src/ai/voice/preview.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/voice/preview.ts'
    symbol: 'buildPreview'
    line_start: '21'
    line_end: '81'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/voice/preview.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.voice.preview.buildpreview` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.preview.buildpreview is the canonical typescript-function named buildPreview.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `buildPreview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/preview.ts:21-81` — buildPreview

## Related Knowledge

- `belongs-to` → `project.backend`
