---
id: "component.backend.backend.src.ai.gateway.context.asserttenant"
kind: "typescript-function"
title: "assertTenant"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "assertTenant"
    line_start: "50"
    line_end: "54"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/context.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.context.asserttenant` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.asserttenant is the canonical typescript-function named assertTenant.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`
- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `assertTenant`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:50-54` — assertTenant

## Related Knowledge

- `belongs-to` → `project.backend`
