---
id: "component.frontend.frontend.src.components.shared.sections.tagstyles.tagstylemap"
kind: "typescript-type-alias"
title: "TagStyleMap"
status: "observed"
summary: "Exported type-alias from frontend/src/components/shared/sections/tagStyles.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/tagStyles.ts"
    symbol: "TagStyleMap"
    line_start: "29"
    line_end: "29"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/tagStyles.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.tagstyles.tagstylemap` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.tagstyles.tagstylemap is the canonical typescript-type-alias named TagStyleMap.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/SemanticTaggedText.tsx`

## Invariants

The symbol is exported across its module boundary as `TagStyleMap`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/tagStyles.ts:29-29` — TagStyleMap

## Related Knowledge

- `belongs-to` → `project.frontend`
