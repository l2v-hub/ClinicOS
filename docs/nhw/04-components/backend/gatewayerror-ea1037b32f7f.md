---
id: "component.backend.backend.src.ai.gateway.types.gatewayerror"
kind: "typescript-class"
title: "GatewayError"
status: "observed"
summary: "Exported class from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "GatewayError"
    line_start: "101"
    line_end: "115"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.gatewayerror` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.gatewayerror is the canonical typescript-class named GatewayError.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`
- `backend/src/ai/assistant/service.ts`
- `backend/src/ai/gateway/context.ts`
- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/services.ts`
- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/ai-assistant-public.ts`
- `backend/src/routes/internal-ai.ts`

## Invariants

The symbol is exported across its module boundary as `GatewayError`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:101-115` — GatewayError

## Related Knowledge

- `belongs-to` → `project.backend`
