---
id: "component.backend.backend.src.ai.voice.plan.voiceplancontext"
kind: "typescript-interface"
title: "VoicePlanContext"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/plan.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/plan.ts"
    symbol: "VoicePlanContext"
    line_start: "66"
    line_end: "69"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.plan.voiceplancontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.plan.voiceplancontext is the canonical typescript-interface named VoicePlanContext.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `VoicePlanContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/plan.ts:66-69` — VoicePlanContext

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
