---
id: "component.backend.backend.src.ai.actions.consegne.groundconsegnaplan"
kind: "typescript-function"
title: "groundConsegnaPlan"
status: "observed"
summary: "Exported function from backend/src/ai/actions/consegne.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "groundConsegnaPlan"
    line_start: "109"
    line_end: "136"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/consegne.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.consegne.groundconsegnaplan` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.consegne.groundconsegnaplan is the canonical typescript-function named groundConsegnaPlan.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`

## Invariants

The symbol is exported across its module boundary as `groundConsegnaPlan`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/consegne.ts:109-136` — groundConsegnaPlan

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
