---
id: "component.backend.backend.src.ai.actions.consegne.buildconsegnapreview"
kind: "typescript-function"
title: "buildConsegnaPreview"
status: "observed"
summary: "Exported function from backend/src/ai/actions/consegne.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "buildConsegnaPreview"
    line_start: "139"
    line_end: "154"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.consegne.buildconsegnapreview` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.consegne.buildconsegnapreview is the canonical typescript-function named buildConsegnaPreview.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `buildConsegnaPreview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/consegne.ts:139-154` — buildConsegnaPreview

## Related Knowledge

- `belongs-to` → `project.backend`
