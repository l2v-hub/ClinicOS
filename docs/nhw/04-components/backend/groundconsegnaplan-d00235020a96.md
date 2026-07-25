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
    target: "project.backend"
    evidence: "backend/src/ai/actions/consegne.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
