---
id: "component.backend.backend.src.ai.actions.consegne.matchconsegnacommand"
kind: "typescript-function"
title: "matchConsegnaCommand"
status: "observed"
summary: "Exported function from backend/src/ai/actions/consegne.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "matchConsegnaCommand"
    line_start: "47"
    line_end: "93"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/actions/consegne.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.consegne.matchconsegnacommand` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.consegne.matchconsegnacommand is the canonical typescript-function named matchConsegnaCommand.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `matchConsegnaCommand`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/consegne.ts:47-93` — matchConsegnaCommand

## Related Knowledge

- `belongs-to` → `project.backend`
