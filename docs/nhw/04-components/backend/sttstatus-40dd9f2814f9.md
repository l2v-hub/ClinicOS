---
id: "component.backend.backend.src.ai.voice.config.sttstatus"
kind: "typescript-interface"
title: "SttStatus"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/config.ts"
    symbol: "SttStatus"
    line_start: "43"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.config.sttstatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.config.sttstatus is the canonical typescript-interface named SttStatus.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/provider.ts`

## Invariants

The symbol is exported across its module boundary as `SttStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/config.ts:43-48` — SttStatus

## Related Knowledge

- `belongs-to` → `project.backend`
