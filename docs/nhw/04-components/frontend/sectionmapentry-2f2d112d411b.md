---
id: "component.frontend.frontend.src.components.shared.sections.sectionmapping.sectionmapentry"
kind: "typescript-interface"
title: "SectionMapEntry"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/sectionMapping.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/sectionMapping.ts"
    symbol: "SectionMapEntry"
    line_start: "10"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/sectionMapping.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.sectionmapping.sectionmapentry` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.sectionmapping.sectionmapentry is the canonical typescript-interface named SectionMapEntry.

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

The symbol is exported across its module boundary as `SectionMapEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/sectionMapping.ts:10-16` — SectionMapEntry

## Related Knowledge

- `belongs-to` → `project.frontend`
