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
    target: "project.backend"
    evidence: "backend/src/ai/voice/plan.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
