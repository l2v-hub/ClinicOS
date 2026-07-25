---
id: "component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext"
kind: "typescript-interface"
title: "AgnosOperatorContext"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/orchestrate.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "AgnosOperatorContext"
    line_start: "57"
    line_end: "61"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/orchestrate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext is the canonical typescript-interface named AgnosOperatorContext.

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
- `backend/src/routes/ai-actions.ts`

## Invariants

The symbol is exported across its module boundary as `AgnosOperatorContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/orchestrate.ts:57-61` — AgnosOperatorContext

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
