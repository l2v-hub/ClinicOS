---
id: "component.backend.backend.src.ai.gateway.types.usercontext"
kind: "typescript-interface"
title: "UserContext"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "UserContext"
    line_start: "34"
    line_end: "41"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.usercontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.usercontext is the canonical typescript-interface named UserContext.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/__tests__/voice-privacy-logging.test.ts`
- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/assistant/service.ts`
- `backend/src/ai/gateway/audit.ts`
- `backend/src/ai/gateway/context.ts`
- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/query/patient-scope.ts`
- `backend/src/ai/gateway/services.ts`
- `backend/src/routes/ai-assistant-public.ts`

## Invariants

The symbol is exported across its module boundary as `UserContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:34-41` — UserContext

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
