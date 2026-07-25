---
id: "component.backend.backend.src.ai.voice.config.loadvoiceconfig"
kind: "typescript-function"
title: "loadVoiceConfig"
status: "observed"
summary: "Exported function from backend/src/ai/voice/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/config.ts"
    symbol: "loadVoiceConfig"
    line_start: "25"
    line_end: "36"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.config.loadvoiceconfig` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.config.loadvoiceconfig is the canonical typescript-function named loadVoiceConfig.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/__tests__/voice-privacy-logging.test.ts`
- `backend/src/ai/__tests__/voice-provider.test.ts`
- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/voice/provider.ts`
- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/ai-voice.ts`

## Invariants

The symbol is exported across its module boundary as `loadVoiceConfig`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/config.ts:25-36` — loadVoiceConfig

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
