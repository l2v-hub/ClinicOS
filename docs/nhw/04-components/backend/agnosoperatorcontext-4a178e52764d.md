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
    target: "project.backend"
    evidence: "backend/src/ai/actions/orchestrate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
