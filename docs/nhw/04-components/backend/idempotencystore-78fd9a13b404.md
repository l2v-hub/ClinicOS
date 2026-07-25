---
id: "component.backend.backend.src.ai.voice.idempotency.idempotencystore"
kind: "typescript-class"
title: "IdempotencyStore"
status: "observed"
summary: "Exported class from backend/src/ai/voice/idempotency.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/idempotency.ts"
    symbol: "IdempotencyStore"
    line_start: "14"
    line_end: "31"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/idempotency.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.idempotency.idempotencystore` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.idempotency.idempotencystore is the canonical typescript-class named IdempotencyStore.

## Inputs

Defined by the source signature at the cited span.

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
- `backend/src/ai/voice/execute.ts`

## Invariants

The symbol is exported across its module boundary as `IdempotencyStore`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/idempotency.ts:14-31` — IdempotencyStore

## Related Knowledge

- `belongs-to` → `project.backend`
