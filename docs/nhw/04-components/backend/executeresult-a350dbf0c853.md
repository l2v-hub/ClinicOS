---
id: "component.backend.backend.src.ai.voice.types.executeresult"
kind: "typescript-interface"
title: "ExecuteResult"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/types.ts"
    symbol: "ExecuteResult"
    line_start: "74"
    line_end: "81"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.types.executeresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.types.executeresult is the canonical typescript-interface named ExecuteResult.

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
- `backend/src/ai/voice/execute.ts`
- `backend/src/ai/voice/idempotency.ts`

## Invariants

The symbol is exported across its module boundary as `ExecuteResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/types.ts:74-81` — ExecuteResult

## Related Knowledge

- `belongs-to` → `project.backend`
