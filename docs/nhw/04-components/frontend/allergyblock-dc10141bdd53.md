---
id: "component.frontend.frontend.src.components.shared.sections.types.allergyblock"
kind: "typescript-interface"
title: "AllergyBlock"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "AllergyBlock"
    line_start: "72"
    line_end: "78"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.allergyblock` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.allergyblock is the canonical typescript-interface named AllergyBlock.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AllergyBlock`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:72-78` — AllergyBlock

## Related Knowledge

- `belongs-to` → `project.frontend`
