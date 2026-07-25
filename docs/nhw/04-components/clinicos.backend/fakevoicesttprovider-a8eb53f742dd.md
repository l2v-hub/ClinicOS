---
id: "component.backend.backend.src.ai.voice.provider.fakevoicesttprovider"
kind: "typescript-class"
title: "FakeVoiceSttProvider"
status: "observed"
summary: "Exported class from backend/src/ai/voice/provider.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/provider.ts"
    symbol: "FakeVoiceSttProvider"
    line_start: "47"
    line_end: "77"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/provider.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
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

Owning project: `project.clinicos.backend`.

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

- `belongs-to` → `project.clinicos.backend`
