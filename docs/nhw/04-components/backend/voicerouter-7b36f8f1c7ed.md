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
    target: "project.backend"
    evidence: "backend/src/routes/ai-voice.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
