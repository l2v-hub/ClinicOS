---
id: "component.backend.backend.src.routes.ai-voice.voicerouter"
kind: "typescript-constant"
title: "voiceRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/ai-voice.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-voice.ts"
    symbol: "voiceRouter"
    line_start: "18"
    line_end: "18"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/ai-voice.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-voice.voicerouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-voice.voicerouter is the canonical typescript-constant named voiceRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `voiceRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-voice.ts:18-18` — voiceRouter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
