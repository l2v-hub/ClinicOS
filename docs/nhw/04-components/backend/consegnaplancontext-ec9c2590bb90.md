---
id: "component.backend.backend.src.ai.actions.consegne.consegnaplancontext"
kind: "typescript-interface"
title: "ConsegnaPlanContext"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/consegne.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "ConsegnaPlanContext"
    line_start: "37"
    line_end: "39"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/actions/consegne.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.consegne.consegnaplancontext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.consegne.consegnaplancontext is the canonical typescript-interface named ConsegnaPlanContext.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `ConsegnaPlanContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/consegne.ts:37-39` — ConsegnaPlanContext

## Related Knowledge

- `belongs-to` → `project.backend`
