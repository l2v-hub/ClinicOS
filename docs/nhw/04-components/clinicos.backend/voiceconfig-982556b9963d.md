---
id: "component.backend.backend.src.ai.voice.config.voiceconfig"
kind: "typescript-interface"
title: "VoiceConfig"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/config.ts"
    symbol: "VoiceConfig"
    line_start: "4"
    line_end: "12"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.config.voiceconfig` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.config.voiceconfig is the canonical typescript-interface named VoiceConfig.

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
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/voice/execute.ts`
- `backend/src/ai/voice/provider.ts`

## Invariants

The symbol is exported across its module boundary as `VoiceConfig`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/config.ts:4-12` — VoiceConfig

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
