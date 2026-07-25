---
id: "component.backend.backend.src.ai.voice.execute.voiceerror"
kind: "typescript-class"
title: "VoiceError"
status: "observed"
summary: "Exported class from backend/src/ai/voice/execute.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/execute.ts"
    symbol: "VoiceError"
    line_start: "22"
    line_end: "30"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/execute.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.execute.voiceerror` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.execute.voiceerror is the canonical typescript-class named VoiceError.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/__tests__/voice-privacy-logging.test.ts`
- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/ai-voice.ts`

## Invariants

The symbol is exported across its module boundary as `VoiceError`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/execute.ts:22-30` — VoiceError

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
