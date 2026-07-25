---
id: "component.backend.backend.src.routes.ai-actions.agnosoperatorfrom"
kind: "typescript-function"
title: "agnosOperatorFrom"
status: "observed"
summary: "Exported function from backend/src/routes/ai-actions.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/ai-actions.ts"
    symbol: "agnosOperatorFrom"
    line_start: "28"
    line_end: "32"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/ai-actions.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-actions.agnosoperatorfrom` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-actions.agnosoperatorfrom is the canonical typescript-function named agnosOperatorFrom.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-voice.ts`

## Invariants

The symbol is exported across its module boundary as `agnosOperatorFrom`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-actions.ts:28-32` — agnosOperatorFrom

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
