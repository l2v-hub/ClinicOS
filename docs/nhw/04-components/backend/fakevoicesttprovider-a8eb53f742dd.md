---
id: 'component.backend.backend.src.ai.voice.provider.fakevoicesttprovider'
kind: 'typescript-class'
title: 'FakeVoiceSttProvider'
status: 'observed'
summary: 'Exported class from backend/src/ai/voice/provider.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/voice/provider.ts'
    symbol: 'FakeVoiceSttProvider'
    line_start: '47'
    line_end: '77'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/voice/provider.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'class'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.voice.provider.fakevoicesttprovider` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.provider.fakevoicesttprovider is the canonical typescript-class named FakeVoiceSttProvider.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/voice-provider.test.ts`

## Invariants

The symbol is exported across its module boundary as `FakeVoiceSttProvider`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/provider.ts:47-77` — FakeVoiceSttProvider

## Related Knowledge

- `belongs-to` → `project.backend`
