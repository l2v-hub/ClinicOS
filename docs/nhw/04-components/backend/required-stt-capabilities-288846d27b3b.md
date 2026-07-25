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
    target: "project.backend"
    evidence: "backend/src/ai/voice/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
