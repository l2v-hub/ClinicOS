---
id: "component.frontend.frontend.src.components.shared.sections.sectionmapping.section-map"
kind: "typescript-constant"
title: "SECTION_MAP"
status: "observed"
summary: "Exported constant from frontend/src/components/shared/sections/sectionMapping.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/sectionMapping.ts"
    symbol: "SECTION_MAP"
    line_start: "18"
    line_end: "31"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/sectionMapping.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.sectionmapping.section-map` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.sectionmapping.section-map is the canonical typescript-constant named SECTION_MAP.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/ImportSectionsReview.tsx`

## Invariants

The symbol is exported across its module boundary as `SECTION_MAP`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/sectionMapping.ts:18-31` — SECTION_MAP

## Related Knowledge

- `belongs-to` → `project.frontend`
