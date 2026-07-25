---
id: 'component.backend.backend.src.ai.voice.vitals.parsespokentime'
kind: 'typescript-function'
title: 'parseSpokenTime'
status: 'observed'
summary: 'Exported function from backend/src/ai/voice/vitals.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/voice/vitals.ts'
    symbol: 'parseSpokenTime'
    line_start: '102'
    line_end: '110'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/voice/vitals.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.voice.vitals.parsespokentime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.vitals.parsespokentime is the canonical typescript-function named parseSpokenTime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/plan.ts`

## Invariants

The symbol is exported across its module boundary as `parseSpokenTime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/vitals.ts:102-110` — parseSpokenTime

## Related Knowledge

- `belongs-to` → `project.backend`
