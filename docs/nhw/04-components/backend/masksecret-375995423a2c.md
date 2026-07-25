---
id: "component.backend.backend.src.ai.redact.masksecret"
kind: "typescript-function"
title: "maskSecret"
status: "observed"
summary: "Exported function from backend/src/ai/redact.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/redact.ts"
    symbol: "maskSecret"
    line_start: "16"
    line_end: "20"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/redact.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.redact.masksecret` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.redact.masksecret is the canonical typescript-function named maskSecret.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`

## Invariants

The symbol is exported across its module boundary as `maskSecret`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/redact.ts:16-20` — maskSecret

## Related Knowledge

- `belongs-to` → `project.backend`
