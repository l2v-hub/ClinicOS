---
id: "component.frontend.frontend.src.components.shared.sections.types.allergystatus"
kind: "typescript-type-alias"
title: "AllergyStatus"
status: "observed"
summary: "Exported type-alias from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "AllergyStatus"
    line_start: "69"
    line_end: "70"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.allergystatus` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.allergystatus is the canonical typescript-type-alias named AllergyStatus.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/deriveSections.ts`

## Invariants

The symbol is exported across its module boundary as `AllergyStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:69-70` — AllergyStatus

## Related Knowledge

- `belongs-to` → `project.frontend`
