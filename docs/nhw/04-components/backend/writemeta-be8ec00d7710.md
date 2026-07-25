---
id: "component.backend.backend.src.ai.voice.execute.writemeta"
kind: "typescript-interface"
title: "WriteMeta"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/execute.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/execute.ts"
    symbol: "WriteMeta"
    line_start: "32"
    line_end: "36"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.execute.writemeta` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.execute.writemeta is the canonical typescript-interface named WriteMeta.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/write-services.ts`

## Invariants

The symbol is exported across its module boundary as `WriteMeta`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/execute.ts:32-36` — WriteMeta

## Related Knowledge

- `belongs-to` → `project.backend`
