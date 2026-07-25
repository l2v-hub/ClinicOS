---
id: "component.backend.backend.src.ai.voice.idempotency.voiceidempotency"
kind: "typescript-constant"
title: "voiceIdempotency"
status: "observed"
summary: "Exported constant from backend/src/ai/voice/idempotency.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/idempotency.ts"
    symbol: "voiceIdempotency"
    line_start: "34"
    line_end: "34"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/idempotency.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.idempotency.voiceidempotency` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.idempotency.voiceidempotency is the canonical typescript-constant named voiceIdempotency.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `voiceIdempotency`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/idempotency.ts:34-34` — voiceIdempotency

## Related Knowledge

- `belongs-to` → `project.backend`
