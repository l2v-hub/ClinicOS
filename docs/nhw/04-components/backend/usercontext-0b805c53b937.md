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
    target: "project.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
