---
id: "component.frontend.frontend.src.components.shared.sections.tagstyles.default-tag-styles"
kind: "typescript-constant"
title: "DEFAULT_TAG_STYLES"
status: "observed"
summary: "Exported constant from frontend/src/components/shared/sections/tagStyles.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/tagStyles.ts"
    symbol: "DEFAULT_TAG_STYLES"
    line_start: "14"
    line_end: "27"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/tagStyles.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.tagstyles.default-tag-styles` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.tagstyles.default-tag-styles is the canonical typescript-constant named DEFAULT_TAG_STYLES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/scripts/req038-evidence.mts`
- `frontend/src/components/shared/sections/__tests__/datePrefix.test.ts`
- `frontend/src/components/shared/sections/__tests__/segments.test.ts`

## Invariants

The symbol is exported across its module boundary as `DEFAULT_TAG_STYLES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/tagStyles.ts:14-27` — DEFAULT_TAG_STYLES

## Related Knowledge

- `belongs-to` → `project.frontend`
