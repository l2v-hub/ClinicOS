---
id: "component.backend.backend.src.ai.voice.execute.voicewriter"
kind: "typescript-interface"
title: "VoiceWriter"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/execute.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/execute.ts"
    symbol: "VoiceWriter"
    line_start: "39"
    line_end: "76"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/execute.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.execute.voicewriter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.execute.voicewriter is the canonical typescript-interface named VoiceWriter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/__tests__/voice-privacy-logging.test.ts`
- `backend/src/ai/__tests__/voice.test.ts`
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `VoiceWriter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/execute.ts:39-76` — VoiceWriter

## Related Knowledge

- `belongs-to` → `project.backend`
