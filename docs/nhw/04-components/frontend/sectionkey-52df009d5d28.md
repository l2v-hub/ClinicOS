---
id: "component.frontend.frontend.src.components.shared.sections.types.sectionkey"
kind: "typescript-type-alias"
title: "SectionKey"
status: "observed"
summary: "Exported type-alias from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "SectionKey"
    line_start: "4"
    line_end: "16"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.sectionkey` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.sectionkey is the canonical typescript-type-alias named SectionKey.

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
- `frontend/src/components/shared/sections/sectionMapping.ts`

## Invariants

The symbol is exported across its module boundary as `SectionKey`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:4-16` — SectionKey

## Related Knowledge

- `belongs-to` → `project.frontend`
