---
id: "component.backend.backend.src.ai.voice.types.voiceactiontype"
kind: "typescript-type-alias"
title: "VoiceActionType"
status: "observed"
summary: "Exported type-alias from backend/src/ai/voice/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/types.ts"
    symbol: "VoiceActionType"
    line_start: "7"
    line_end: "18"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.types.voiceactiontype` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.types.voiceactiontype is the canonical typescript-type-alias named VoiceActionType.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/appointments.ts`
- `backend/src/ai/actions/consegne.ts`
- `backend/src/ai/voice/execute.ts`
- `backend/src/ai/voice/plan.ts`

## Invariants

The symbol is exported across its module boundary as `VoiceActionType`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/types.ts:7-18` — VoiceActionType

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
