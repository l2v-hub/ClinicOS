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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
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
