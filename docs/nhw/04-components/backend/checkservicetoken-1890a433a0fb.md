---
id: "component.backend.backend.src.ai.gateway.context.checkservicetoken"
kind: "typescript-function"
title: "checkServiceToken"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "checkServiceToken"
    line_start: "16"
    line_end: "23"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.context.checkservicetoken` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.checkservicetoken is the canonical typescript-function named checkServiceToken.

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
- `backend/src/routes/internal-ai.ts`

## Invariants

The symbol is exported across its module boundary as `checkServiceToken`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:16-23` — checkServiceToken

## Related Knowledge

- `belongs-to` → `project.backend`
