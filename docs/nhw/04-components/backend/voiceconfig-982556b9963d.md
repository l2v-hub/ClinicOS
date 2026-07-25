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
    target: "project.backend"
    evidence: "backend/src/ai/voice/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
