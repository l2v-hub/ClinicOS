---
id: "component.backend.backend.src.ai.voice.config.required-stt-capabilities"
kind: "typescript-constant"
title: "REQUIRED_STT_CAPABILITIES"
status: "observed"
summary: "Exported constant from backend/src/ai/voice/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/config.ts"
    symbol: "REQUIRED_STT_CAPABILITIES"
    line_start: "41"
    line_end: "41"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.config.required-stt-capabilities` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.config.required-stt-capabilities is the canonical typescript-constant named REQUIRED_STT_CAPABILITIES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/voice-provider.test.ts`
- `backend/src/ai/voice/provider.ts`
- `backend/src/routes/ai-voice.ts`

## Invariants

The symbol is exported across its module boundary as `REQUIRED_STT_CAPABILITIES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/config.ts:41-41` — REQUIRED_STT_CAPABILITIES

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
