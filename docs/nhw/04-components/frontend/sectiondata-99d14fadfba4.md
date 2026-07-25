---
id: "component.frontend.frontend.src.components.shared.sections.types.sectiondata"
kind: "typescript-interface"
title: "SectionData"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "SectionData"
    line_start: "57"
    line_end: "67"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.sectiondata` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.sectiondata is the canonical typescript-interface named SectionData.

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
- `frontend/src/components/shared/sections/deriveSections.ts`

## Invariants

The symbol is exported across its module boundary as `SectionData`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:57-67` — SectionData

## Related Knowledge

- `belongs-to` → `project.frontend`
