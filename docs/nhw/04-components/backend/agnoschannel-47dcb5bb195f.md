---
id: "component.backend.backend.src.ai.actions.orchestrate.agnoschannel"
kind: "typescript-type-alias"
title: "AgnosChannel"
status: "observed"
summary: "Exported type-alias from backend/src/ai/actions/orchestrate.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "AgnosChannel"
    line_start: "43"
    line_end: "43"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/actions/orchestrate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.orchestrate.agnoschannel` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.orchestrate.agnoschannel is the canonical typescript-type-alias named AgnosChannel.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-actions.ts`

## Invariants

The symbol is exported across its module boundary as `AgnosChannel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/orchestrate.ts:43-43` — AgnosChannel

## Related Knowledge

- `belongs-to` → `project.backend`
