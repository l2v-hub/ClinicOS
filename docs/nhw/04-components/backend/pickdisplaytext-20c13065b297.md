---
id: 'component.backend.backend.src.ai.sections.patient-narrative.pickdisplaytext'
kind: 'typescript-function'
title: 'pickDisplayText'
status: 'observed'
summary: 'Exported function from backend/src/ai/sections/patient-narrative.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/ai/sections/patient-narrative.ts'
    symbol: 'pickDisplayText'
    line_start: '103'
    line_end: '105'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/sections/patient-narrative.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.pickdisplaytext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.pickdisplaytext is the canonical typescript-function named pickDisplayText.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/patient-narrative.test.ts`
- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `pickDisplayText`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:103-105` — pickDisplayText

## Related Knowledge

- `belongs-to` → `project.backend`
